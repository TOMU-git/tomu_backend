import { Injectable } from "@nestjs/common";
import { TTSService } from "../tts.service";
import { AIChatMessageFactory } from "../ai-chat-message-factory.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";

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
        // TTS orqali audio yaratish (xarajat ma'lumotlari bilan)
        const ttsResult = await this.tts.textToSpeechWithUsage({
            text: input.aiResponse,
            language: 'ar',
        });

        // Xarajat ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.tts = {
            characters: ttsResult.characters || 0,
        };

        // Xabarni yaratish va saqlash
        const message = await this.messageFactory.createResponseMessage(
            Number(input.sessionId),
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit - limit ichida
            ttsResult.audioUrl // Audio URL
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


