import { Injectable } from "@nestjs/common";
import { TTSService } from "../tts.service";
import { AIChatMessageFactory } from "../ai-chat-message-factory.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";
import {
    validateGPTResponseDiacritics,
    checkLastLetterDiacriticsInText,
    logDiacriticsInfo
} from "../../utils/diacritics-validator.util";

/**
 * Response Step: Yakuniy xabar yaratish
 * 
 * AI javobini audio'ga aylantirib, xabarni yaratadi va saqlaydi
 */
@Injectable()
export class ResponseStep implements PipelineStep {
    constructor(
        private readonly messageFactory: AIChatMessageFactory,
        private readonly tts: TTSService, // TTS servisi - audio yaratish uchun
    ) { }

    async execute(input: VoiceInput & {
        validatedText: string;
        context: any;
        aiResponse: string;
        aiResponseUz: string;
    }): Promise<VoiceOutput> {
        // ✅ STEP 1: Diacritics validation - TTS uchun muhim!
        const diacriticsValidation = validateGPTResponseDiacritics(input.aiResponse);
        const lastLetterCheck = checkLastLetterDiacriticsInText(input.aiResponse);

        // Log diacritics info for debugging
        logDiacriticsInfo(input.aiResponse, 'AI Response');
        console.log(`[Response Step] Last letter diacritics: ${lastLetterCheck.wordsWithLastLetterDiacritics}/${lastLetterCheck.totalWords} words (${lastLetterCheck.percentage}%)`);

        // Warning agar diacritics kam bo'lsa
        if (!diacriticsValidation.isValid) {
            console.warn(diacriticsValidation.warning);
        }

        if (lastLetterCheck.percentage < 70) {
            console.warn(`⚠️  Low last-letter diacritics coverage (${lastLetterCheck.percentage}%). TTS may drop ending sounds!`);
        }

        // TTS orqali audio yaratish (xarajat ma'lumotlari bilan)
        const ttsResult = await this.tts.textToSpeechWithUsage({
            text: input.aiResponse,
            language: 'ar',
        });

        // Xarajat ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.tts = {
            characters: ttsResult.characters || 0,
            duration: ttsResult.duration || 0, // AI audio duration
        };

        // Debug: TTS result log (batafsil)
        console.log(`[ResponseStep] TTS result:`, JSON.stringify({
            audioUrl: ttsResult.audioUrl,
            characters: ttsResult.characters,
            duration: ttsResult.duration,
            durationType: typeof ttsResult.duration
        }));

        // Xabarni yaratish va saqlash
        const message = await this.messageFactory.createResponseMessage(
            Number(input.sessionId),
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit - limit ichida
            ttsResult.audioUrl, // Audio URL
            ttsResult.duration // Audio duration (soniyalarda)
        );

        // Xarajat ma'lumotlarini xabar bilan birga qaytarish
        // (Pipeline'da trackCost metodida ishlatish uchun)
        return {
            message,
            session: input.session,
            usage: usage, // Pipeline'da xarajatni hisoblash uchun
            transcribedText: input.validatedText, // Foydalanuvchi xabarini saqlash uchun
        } as VoiceOutput & { usage?: VoiceInput['usage']; transcribedText?: string };
    }
}


