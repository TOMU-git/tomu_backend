import { Injectable } from "@nestjs/common";
import { WhisperService } from "../whisper.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";

/**
 * STT Step: Audio -> Text
 * 
 * Audio faylni matnga aylantirish (Speech-to-Text)
 * Whisper API orqali audio transkripsiya qilinadi
 */
@Injectable()
export class STTStep implements PipelineStep {
    constructor(private readonly whisper: WhisperService) { }

    async execute(input: VoiceInput): Promise<VoiceInput> {
        // Audio tili (default: arab tili)
        const sttLang = (input.language && typeof input.language === 'string' && input.language.trim())
            ? input.language.trim()
            : 'ar';

        // Audio'ni matnga aylantirish (xarajat ma'lumotlari bilan)
        const whisperResult = await this.whisper.speechToTextWithUsage({
            audio: input.audioBuffer,
            language: sttLang
        });

        // Xarajat ma'lumotlarini to'plash
        const usage = input.usage || {};
        usage.whisper = {
            duration: whisperResult.duration || 0, // Audio davomiyligi (soniya)
        };

        return {
            ...input,
            transcribedText: whisperResult.text, // Transkripsiya qilingan matn
            usage,
        } as VoiceInput & { transcribedText: string };
    }
}


