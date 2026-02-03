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
        audioUrl?: string | null; // ✅ Tayyor audio (agar mavjud bo'lsa)
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

        // ✅ TAYYOR AUDIO: Agar GPTStep'dan tayyor audio kelsa, TTS skip qilish
        let finalAudioUrl: string;
        let audioDuration: number | null = null;
        const usage = input.usage || {};

        if (input.audioUrl) {
            // Tayyor audio ishlatish - TTS skip
            console.log(`[ResponseStep] ✅ Using pre-recorded audio: ${input.audioUrl}`);
            finalAudioUrl = input.audioUrl;
            usage.tts = { characters: 0, duration: 0 }; // TTS ishlatilmadi
        } else {
            // TTS orqali audio yaratish (xarajat ma'lumotlari bilan)
            console.log(`[ResponseStep] 🎤 Generating TTS audio...`);
            const ttsResult = await this.tts.textToSpeechWithUsage({
                text: input.aiResponse,
                language: 'ar',
            });

            finalAudioUrl = ttsResult.audioUrl;
            audioDuration = ttsResult.duration || 0;
            usage.tts = {
                characters: ttsResult.characters || 0,
                duration: audioDuration,
            };

            // Debug: TTS result log (batafsil)
            console.log(`[ResponseStep] TTS result:`, JSON.stringify({
                audioUrl: ttsResult.audioUrl,
                characters: ttsResult.characters,
                duration: ttsResult.duration,
                durationType: typeof ttsResult.duration
            }));
        }

        // Xabarni yaratish va saqlash
        const message = await this.messageFactory.createResponseMessage(
            Number(input.sessionId),
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit - limit ichida
            finalAudioUrl, // Audio URL (tayyor yoki TTS)
            audioDuration // Audio duration (soniyalarda)
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


