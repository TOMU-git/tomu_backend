import { Injectable } from "@nestjs/common";
import { TTSService } from "../tts.service";
import { AIChatMessageFactory } from "../ai-chat-message-factory.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline.types";
import { ArabicTextUtils } from "../../utils/arabic-text.util";

/**
 * Validation Step: Matn validatsiyasi va fallback
 * 
 * STT natijasini tekshiradi:
 * - Bo'sh yoki qisqa bo'lsa fallback javob
 * - Arab tilidan boshqa til bo'lsa fallback javob
 */
@Injectable()
export class ValidationStep implements PipelineStep {
    constructor(
        private readonly tts: TTSService,
        private readonly messageFactory: AIChatMessageFactory
    ) { }

    async execute(input: VoiceInput & { transcribedText: string }): Promise<VoiceInput | VoiceOutput> {
        const trimmed = (input.transcribedText || "").trim();

        // STT natijasi bo'sh yoki juda qisqa bo'lsa
        if (!trimmed || trimmed.length < 2) {
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'empty' // Bo'sh matn fallback
            );
            return { message, session: input.session };
        }

        // Arab tilidan boshqa til bo'lsa
        if (!ArabicTextUtils.isArabicText(trimmed)) {
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'non-arabic' // Arab tilidan boshqa til fallback
            );
            return { message, session: input.session };
        }

        // Validatsiya muvaffaqiyatli - matn keyingi step'ga uzatiladi
        return {
            ...input,
            validatedText: trimmed,
        } as VoiceInput & { validatedText: string };
    }

}


