import { Injectable } from "@nestjs/common";
import { TTSService } from "../tts.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";
import { ArabicTextUtils } from "../../utils/arabic-text.util";
import { AIChatMessage } from "../../entities/ai-chat-message.entity";
import { AIChatSession } from "../../entities/ai-chat-session.entity";

/**
 * Validation Step: Text validation va fallback
 */
@Injectable()
export class ValidationStep implements PipelineStep {
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


