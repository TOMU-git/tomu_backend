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
    validatedText?: string;
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
            new ValidationStep(this.tts),
            new ContextStep(this.aiChatService, this.tts),
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
    constructor(private readonly tts: TTSService) { }

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
        const message = new AIChatMessage();
        message.sessionId = input.session.id as unknown as any;
        message.session = { id: input.session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = text;
        message.isWithinLimit = true;
        message.messageLanguage = input.session.sessionLanguage;
        message.contextUsed = { note: `${type}-transcript-fallback` };

        if (type === 'empty') {
            console.log("👂 Bo'sh audio aniqlandi, maxsus javob yuborilmoqda.");
            message.aiResponseText = 'عَفْوًا، لَمْ أَسْمَعْ شَيْئًا. هَلْ يُمْكِنُكَ التَّحَدُّثُ؟';
            message.aiResponseUzbek = 'Kechirasiz, hech narsa eshitmadim. Gapira olasizmi?';
        } else {
            console.log("🚫 Arab tilidan boshqa til aniqlandi, maxsus javob yuborilmoqda.");
            message.aiResponseText = 'مِنْ فَضْلِكَ، تَحَدَّثْ بِالْعَرَبِيَّةِ فَقَطْ.';
            message.aiResponseUzbek = 'Iltimos, faqat arab tilida gapiring.';
        }

        // TTS audio yaratish
        message.audioUrl = await this.tts.textToSpeech({
            text: message.aiResponseText,
            language: 'ar'
        });

        return message;
    }
}

/**
 * Context Step: Context building using full buildContext logic
 */
class ContextStep implements PipelineStep {
    constructor(
        private readonly aiChatService: AIChatService, // AIChatService'dan buildContext ishlatish uchun
        private readonly tts: TTSService // TTS for audio generation
    ) { }

    async execute(input: VoiceInput & { validatedText: string }): Promise<VoiceInput | VoiceOutput> {
        // AIChatService'dan to'liq kontekst olish (profile, courseProgress, lessonProgress bilan)
        const fullContext = await this.aiChatService['buildContext']({
            userId: Number(input.userId),
            courseId: Number(input.courseId || input.session.courseId),
        });

        const courseProgress = fullContext.courseProgress;
        const userLevel = fullContext.userLevel;

        // User ko'rgan eng oxirgi dars tartib raqami
        const lastWatchedLessonOrder = userLevel?.currentLessonOrder || 0;
        console.log(`📊 User progress: Last watched lesson order = ${lastWatchedLessonOrder}`);

        // Context'dan barcha darslarni olish
        const allLessons = fullContext.chromaContext || [];

        // User textida qanday so'zlar borligini tekshirish
        const userText = input.validatedText || '';

        // Agar user text kelmagan darslardan bo'lsa, maxsus javob qaytarish
        // Strict check: Faqat GPT javobiga qarab tekshiramiz, chunki biz xavfni oldini olishga harakat qilamiz
        // Lekin user har qanday gapirishi mumkin, shuning uchun yaxshiroqroq yondashish kerak
        const possibleLessons = this.findPossibleFutureLessons(userText, allLessons, lastWatchedLessonOrder);

        if (possibleLessons.futureLessons.length > 0) {
            console.log(`⚠️ User gapirishga harakat qilayotgan darslar: ${possibleLessons.futureLessons.join(', ')}`);
            console.log(`📊 Current lesson: ${lastWatchedLessonOrder}`);

            // Maxsus javob yaratish
            const message = await this.createFutureLessonMessage(input, lastWatchedLessonOrder, Math.min(...possibleLessons.futureLessons));
            return { message, session: input.session };
        }

        return {
            ...input,
            context: allLessons,
        } as VoiceInput & { context: any };
    }

    private findPossibleFutureLessons(text: string, lessons: any[], currentOrder: number): { mentioned: number[], futureLessons: number[] } {
        const mentioned: number[] = [];

        // User textidagi maxsus so'zlarni olish (ismlar, predmetlar)
        const specialWords = this.extractSpecialWords(text);
        const userText = text.toLowerCase();

        // Har bir lesson'ni text bilan solishtiramiz
        for (const lesson of lessons) {
            if (!lesson.text) continue;

            const lessonText = lesson.text.toLowerCase();

            // To'liq matn solishtirish
            if (userText.includes(lessonText) || lessonText.includes(userText)) {
                if (!mentioned.includes(lesson.lessonOrder)) {
                    mentioned.push(lesson.lessonOrder);
                    continue;
                }
            }

            // Maxsus so'zlarni tekshirish
            for (const word of specialWords) {
                if (lessonText.includes(word)) {
                    if (!mentioned.includes(lesson.lessonOrder)) {
                        mentioned.push(lesson.lessonOrder);
                    }
                }
            }
        }

        // Kelmagan darslarni ajratish
        const futureLessons = mentioned.filter(l => l > currentOrder);

        return { mentioned, futureLessons };
    }

    private extractSpecialWords(text: string): string[] {
        // Ismlar, narsa nomlari va muhim so'zlarni ajratish
        const words: string[] = [];
        const cleanText = text.toLowerCase().trim();

        // Haqiqiy atamalar (Fotima, Amina va boshqa ismlar)
        const isms = [
            'فَاطِمَة', 'فاطمة',
            'آمِنَة', 'أمينة',
            'مَرْيَم', 'مريم',
            'زَيْنَب', 'زينب'
        ];

        for (const ism of isms) {
            if (cleanText.includes(ism) || cleanText.includes(ism.replace(/َ/g, '').replace(/ُ/g, '').replace(/ِ/g, ''))) {
                words.push(ism);
            }
        }

        // Arab matnidan asosiy so'zlarni ajratish (vorud qilingan narsalar)
        if (cleanText.includes('زَهْرَة') || cleanText.includes('زهرة')) {
            words.push('زَهْرَة');
        }
        if (cleanText.includes('بُرْتُقَال') || cleanText.includes('برتقال')) {
            words.push('بُرْتُقَال');
        }
        if (cleanText.includes('فَسْل') || cleanText.includes('فصل')) {
            words.push('فَسْل');
        }

        return words;
    }

    private async createFutureLessonMessage(
        input: VoiceInput,
        currentLessonOrder: number,
        mentionedLessonOrder: number
    ): Promise<AIChatMessage> {
        const message = new AIChatMessage();
        message.sessionId = input.session.id as unknown as any;
        message.session = { id: input.session.id } as AIChatSession;
        message.senderType = 'ai';
        message.originalText = input.validatedText;
        message.isWithinLimit = true;
        message.messageLanguage = input.session.sessionLanguage;
        message.contextUsed = { note: `future-lesson-warning: current=${currentLessonOrder}, mentioned=${mentionedLessonOrder}` };

        message.aiResponseText = 'لَحْنِ بَعْدُ لَمْ تَصِلْ إِلَى هَٰذَا الدَّرْسِ.';
        message.aiResponseUzbek = 'Siz hali bu darsga kelmagansiz.';

        // TTS audio yaratish
        message.audioUrl = await this.tts.textToSpeech({
            text: message.aiResponseText,
            language: 'ar'
        });

        return message;
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
