import { Injectable, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { WhisperService } from "./whisper.service";
import { GPTService } from "./gpt.service";
import { TTSService } from "./tts.service";
import { ChromaService } from "./chroma.service";
import { TranslationService } from "./translation.service";
import { AIChatMessageFactory } from "./ai-chat-message-factory.service";
import { AIChatService } from "./ai-chat.service";
import { ArabicTextUtils } from "../utils/arabic-text.util";
import { AI_ERROR_MESSAGES } from "../constants/error-messages";
import { SessionForbiddenException } from "../exceptions/session-forbidden.exception";
import { AIChatSession } from "../entities/ai-chat-session.entity";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { ID } from "src/common/types/type";

/**
 * Voice Processing Pipeline
 * -------------------------------------------------------
 * Maqsad: Voice chat oqimini pipeline pattern orqali boshqarish
 * Audio -> STT -> Validation -> Context -> GPT -> TTS -> Response
 */

export interface VoiceInput {
    userId: ID;
    sessionId: ID;
    audioBuffer: Buffer;
    courseId?: ID;
    language?: string;
    session: AIChatSession;
}

export interface VoiceOutput {
    message: AIChatMessage;
    session: AIChatSession;
}

export interface PipelineStep {
    execute(input: VoiceInput): Promise<VoiceInput | VoiceOutput>;
}

@Injectable()
export class VoiceProcessingPipeline {
    constructor(
        private readonly whisper: WhisperService,
        private readonly gpt: GPTService,
        private readonly tts: TTSService,
        private readonly chroma: ChromaService,
        private readonly translation: TranslationService,
        private readonly messageFactory: AIChatMessageFactory,
        @Inject(forwardRef(() => AIChatService))
        private readonly aiChatService: AIChatService, // AIChatService injection for buildContext
    ) { }

    /**
     * Pipeline ni bajarish
     */
    async execute(input: VoiceInput): Promise<VoiceOutput> {
        const pipelineStart = Date.now();
        console.log("\n⏱️  Pipeline boshlandi...");

        const steps: PipelineStep[] = [
            new STTStep(this.whisper),
            new ValidationStep(),
            new ContextStep(this.aiChatService),
            new GPTStep(this.gpt, this.translation),
            new ResponseStep(this.messageFactory),
        ];

        let currentInput: VoiceInput | VoiceOutput = input;

        for (const step of steps) {
            currentInput = await step.execute(currentInput as VoiceInput);

            // Agar step VoiceOutput qaytarsa, pipeline tugadi
            if ('message' in currentInput) {
                const totalTime = Date.now() - pipelineStart;
                console.log(`\n✅ Pipeline tugadi. Umumiy vaqt: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)\n`);
                return currentInput as VoiceOutput;
            }
        }

        throw new Error('Pipeline failed to produce output');
    }
}

/**
 * STT Step: Audio -> Text
 */
class STTStep implements PipelineStep {
    constructor(private readonly whisper: WhisperService) { }

    async execute(input: VoiceInput): Promise<VoiceInput> {
        const sttLang = (input.language && typeof input.language === 'string' && input.language.trim())
            ? input.language.trim()
            : 'ar';

        const text = await this.whisper.speechToText({ audio: input.audioBuffer, language: sttLang });

        return {
            ...input,
            transcribedText: text,
        } as VoiceInput & { transcribedText: string };
    }
}

/**
 * Validation Step: Text validation va fallback
 */
class ValidationStep implements PipelineStep {
    async execute(input: VoiceInput & { transcribedText: string }): Promise<VoiceInput | VoiceOutput> {
        const trimmed = (input.transcribedText || "").trim();

        // STT bo'sh yoki qisqa bo'lsa
        if (!trimmed || trimmed.length < 2) {
            const message = await this.createFallbackMessage(input, trimmed, 'empty');
            return { message, session: input.session };
        }

        // Arab tilidan boshqa til bo'lsa
        if (!ArabicTextUtils.isArabicText(trimmed)) {
            const message = await this.createFallbackMessage(input, trimmed, 'non-arabic');
            return { message, session: input.session };
        }

        return {
            ...input,
            validatedText: trimmed,
        } as VoiceInput & { validatedText: string };
    }

    private async createFallbackMessage(
        input: VoiceInput,
        text: string,
        type: 'empty' | 'non-arabic'
    ): Promise<AIChatMessage> {
        // Bu yerda messageFactory ishlatish kerak, lekin circular dependency dan qochish uchun
        // oddiy message yaratamiz
        const message = new AIChatMessage();
        message.sessionId = input.session.id as unknown as any;
        message.session = { id: input.session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = text;
        message.isWithinLimit = true;
        message.messageLanguage = input.session.sessionLanguage;
        message.contextUsed = { note: `${type}-transcript-fallback` };

        if (type === 'empty') {
            message.aiResponseText = 'عَفْوًا، لَمْ أَفْهَمْ. هَلْ يُمْكِنُكَ الإِعَادَةَ مِنْ فَضْلِكَ؟';
            message.aiResponseUzbek = 'Kechirasiz, tushunmadim. Iltimos, qayta ayting.';
        } else {
            message.aiResponseText = 'مِنْ فَضْلِكَ، تَحَدَّثْ بِالْعَرَبِيَّةِ فَقَطْ.';
            message.aiResponseUzbek = 'Iltimos, faqat arab tilida gapiring.';
        }

        return message;
    }
}

/**
 * Context Step: Context building using full buildContext logic
 */
class ContextStep implements PipelineStep {
    constructor(
        private readonly aiChatService: AIChatService // AIChatService'dan buildContext ishlatish uchun
    ) { }

    async execute(input: VoiceInput & { validatedText: string }): Promise<VoiceInput> {
        // AIChatService'dan to'liq kontekst olish (profile, courseProgress, lessonProgress bilan)
        const fullContext = await this.aiChatService['buildContext']({
            userId: Number(input.userId),
            courseId: Number(input.courseId || input.session.courseId),
        });

        return {
            ...input,
            context: fullContext.chromaContext,
        } as VoiceInput & { context: any };
    }
}

/**
 * GPT Step: AI response generation
 */
class GPTStep implements PipelineStep {
    constructor(
        private readonly gpt: GPTService,
        private readonly translation: TranslationService,
    ) { }

    async execute(input: VoiceInput & { validatedText: string; context: any }): Promise<VoiceInput> {
        // User input logging
        const userLatin = ArabicTextUtils.transliterateArabic(input.validatedText || "");

        console.log("\n👤 User:");
        console.log("   Arab: " + input.validatedText);
        console.log("   Lotin: " + userLatin);

        // GPT timing
        const gptStart = Date.now();
        const aiResponse = await this.gpt.generate({
            prompt: input.validatedText,
            context: input.context,
            language: 'ar',
            strict: false, // FALSE! Barcha materiallardan qidiradi
        });
        const gptTime = Date.now() - gptStart;

        const aiResponseLatin = ArabicTextUtils.transliterateArabic(aiResponse || "");

        console.log("\n🤖 AI:");
        console.log("   Arab: " + aiResponse);
        console.log("   Lotin: " + aiResponseLatin);
        console.log("   ⏱️  GPT vaqti: " + gptTime + "ms");

        return {
            ...input,
            aiResponse,
            aiResponseUz: '', // Translation o'chirildi - tezlik uchun
        } as VoiceInput & { aiResponse: string; aiResponseUz: string };
    }
}

/**
 * Response Step: Final message creation
 */
class ResponseStep implements PipelineStep {
    constructor(private readonly messageFactory: AIChatMessageFactory) { }

    async execute(input: VoiceInput & {
        validatedText: string;
        context: any;
        aiResponse: string;
        aiResponseUz: string;
    }): Promise<VoiceOutput> {
        const message = await this.messageFactory.createResponseMessage(
            input.session,
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit
            input.context,
            undefined // audioUrl
        );

        return { message, session: input.session };
    }
}
