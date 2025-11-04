import { Injectable } from "@nestjs/common";
import { TTSService } from "../tts.service";
import { AIChatMessageFactory } from "../ai-chat-message-factory.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";

/**
 * Response Step: Final message creation
 */
@Injectable()
export class ResponseStep implements PipelineStep {
    constructor(
        private readonly messageFactory: AIChatMessageFactory,
        private readonly tts: TTSService, // TTS service to'g'ridan-to'g'ri
    ) { }

    async execute(input: VoiceInput & {
        validatedText: string;
        context: any;
        aiResponse: string;
        aiResponseUz: string;
    }): Promise<VoiceOutput> {
        // TTS audio yaratish (usage ma'lumotlari bilan)
        const ttsResult = await this.tts.textToSpeechWithUsage({
            text: input.aiResponse,
            language: 'ar',
        });

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.tts = {
            characters: ttsResult.characters || 0,
        };

        const message = await this.messageFactory.createResponseMessage(
            input.session,
            input.validatedText,
            input.aiResponse,
            input.aiResponseUz,
            true, // withinLimit
            input.context,
            ttsResult.audioUrl // audioUrl
        );

        // Usage ma'lumotlarini message bilan birga qaytarish
        // (Pipeline'dan trackCost metodida ishlatish uchun)
        return {
            message,
            session: input.session,
            usage: usage, // Pipeline'da ishlatish uchun
        } as VoiceOutput & { usage?: VoiceInput['usage'] };
    }
}


