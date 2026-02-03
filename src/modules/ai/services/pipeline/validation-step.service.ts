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
            console.log(`⚠️  Validation: Bo'sh yoki qisqa matn (uzunlik: ${trimmed.length})`);
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'empty' // Bo'sh matn fallback
            );
            return { message, session: input.session };
        }

        // ✅ VALIDATION 1: Minimum so'z soni (1+ so'z) - "ha", "yo'q" kabi qisqa javoblarga ruxsat
        const words = trimmed.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 1) {
            console.log(`⚠️  Validation: Juda qisqa matn (${words.length} so'z, min: 1)`);
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'empty' // Qisqa matn fallback
            );
            return { message, session: input.session };
        }

        // ✅ QATTIQ VALIDATION 2: Arab harf nisbati (50%+)
        const arabicRatio = ArabicTextUtils.getArabicRatio(trimmed);
        if (arabicRatio < 0.5) {
            console.log(`⚠️  Validation: Arab harf nisbati past (${(arabicRatio * 100).toFixed(1)}%, min: 50%)`);
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'non-arabic' // Arab tilidan boshqa til fallback
            );
            return { message, session: input.session };
        }

        // ✅ QATTIQ VALIDATION 3: Random arab harflar (ma'nosiz ketma-ketlik)
        if (ArabicTextUtils.isRandomArabic(trimmed)) {
            console.log(`⚠️  Validation: Random arab harflar aniqlandi (ma'nosiz ketma-ketlik)`);
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'non-arabic' // Random harflar fallback
            );
            return { message, session: input.session };
        }

        // Arab tilidan boshqa til bo'lsa (eski tekshiruv - backup)
        if (!ArabicTextUtils.isArabicText(trimmed)) {
            console.log(`⚠️  Validation: Arab tilidan boshqa til aniqlandi`);
            const message = await this.messageFactory.createFallbackMessage(
                Number(input.sessionId),
                trimmed,
                'non-arabic' // Arab tilidan boshqa til fallback
            );
            return { message, session: input.session };
        }

        // Validatsiya muvaffaqiyatli - matn keyingi step'ga uzatiladi
        console.log(`✅ Validation: Matn validatsiyadan o'tdi (${words.length} so'z, arab: ${(arabicRatio * 100).toFixed(1)}%)`);
        return {
            ...input,
            validatedText: trimmed,
        } as VoiceInput & { validatedText: string };
    }

}


