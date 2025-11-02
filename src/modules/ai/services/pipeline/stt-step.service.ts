import { Injectable } from "@nestjs/common";
import { WhisperService } from "../whisper.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";

/**
 * STT Step: Audio -> Text
 */
@Injectable()
export class STTStep implements PipelineStep {
    constructor(private readonly whisper: WhisperService) { }

    async execute(input: VoiceInput): Promise<VoiceInput> {
        const sttLang = (input.language && typeof input.language === 'string' && input.language.trim())
            ? input.language.trim()
            : 'ar';

        // Usage ma'lumotlarini olish uchun speechToTextWithUsage ishlatamiz
        const whisperResult = await this.whisper.speechToTextWithUsage({
            audio: input.audioBuffer,
            language: sttLang
        });

        // Usage ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.whisper = {
            duration: whisperResult.duration || 0,
        };

        return {
            ...input,
            transcribedText: whisperResult.text,
            usage,
        } as VoiceInput & { transcribedText: string };
    }
}


