import { Injectable, BadRequestException, Inject, forwardRef } from "@nestjs/common";
import { WhisperService, WhisperResponse } from "./whisper.service";
import { GPTService, GPTResponse } from "./gpt.service";
import { TTSService, TTSResponse } from "./tts.service";
import { ChromaService } from "./chroma.service";
import { TranslationService } from "./translation.service";
import { AIChatMessageFactory } from "./ai-chat-message-factory.service";
import { AIChatService } from "./ai-chat.service";
import { ArabicTextUtils } from "../utils/arabic-text.util";
import { AI_ERROR_MESSAGES } from "../constants/error-messages";
import { AI_FALLBACK_MESSAGES } from "../constants/error-messages";
import { SessionForbiddenException } from "../exceptions/session-forbidden.exception";
import { AIChatSession } from "../entities/ai-chat-session.entity";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { ID } from "src/common/types/type";
import { LimitCheckService } from "./limit-check.service";
// Pipeline Steps
import { STTStep } from "./pipeline/stt-step.service";
import { ValidationStep } from "./pipeline/validation-step.service";
import { ContextStep } from "./pipeline/context-step.service";
import { GPTStep } from "./pipeline/gpt-step.service";
import { ResponseStep } from "./pipeline/response-step.service";
import { PipelineStep, VoiceInput, VoiceOutput } from "./pipeline/pipeline.types";

/**
 * Voice Processing Pipeline
 * -------------------------------------------------------
 * Maqsad: Voice chat oqimini pipeline pattern orqali boshqarish
 * Audio -> STT -> Validation -> Context -> GPT -> TTS -> Response
 */

// Types are now in pipeline/pipeline.types.ts - re-export for backward compatibility
export type { VoiceInput, VoiceOutput, PipelineStep } from "./pipeline/pipeline.types";

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
        private readonly limitCheck: LimitCheckService, // Cost tracking uchun
    ) { }

    /**
     * Pipeline ni bajarish
     */
    async execute(input: VoiceInput): Promise<VoiceOutput> {
        const pipelineStart = Date.now();
        console.log("\n⏱️  Pipeline boshlandi...");

        // Usage tracking uchun initializatsiya
        const inputWithUsage: VoiceInput = {
            ...input,
            usage: {},
        };

        const steps: PipelineStep[] = [
            new STTStep(this.whisper),
            new ValidationStep(this.tts),
            new ContextStep(this.aiChatService, this.tts),
            new GPTStep(this.gpt, this.translation),
            new ResponseStep(this.messageFactory, this.tts),
        ];

        let currentInput: VoiceInput | VoiceOutput = inputWithUsage;

        for (const step of steps) {
            try {
                const stepName = step.constructor.name;
                console.log(`\n🔄 Executing step: ${stepName}`);
                currentInput = await step.execute(currentInput as VoiceInput);
                console.log(`✅ Step ${stepName} completed successfully`);

                // Agar step VoiceOutput qaytarsa, pipeline tugadi
                if ('message' in currentInput) {
                    const output = currentInput as VoiceOutput;

                    // Usage ma'lumotlarini olish
                    const usage = (currentInput as any).usage || inputWithUsage.usage || {};

                    // Cost tracking message.id bo'lmasa ham ishlashi uchun
                    // (message hali saqlanmagan bo'lishi mumkin)
                    // Bu holatda messageId null bo'ladi va keyin update qilinadi

                    const totalTime = Date.now() - pipelineStart;
                    console.log(`\n✅ Pipeline tugadi. Umumiy vaqt: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)\n`);

                    // Usage ma'lumotlarini output'ga qo'shish (keyin trackCost'da ishlatish uchun)
                    return {
                        ...output,
                        usage, // Usage ma'lumotlarini qo'shish
                    } as VoiceOutput & { usage?: VoiceInput['usage'] };
                }
            } catch (error: any) {
                const stepName = step.constructor.name;
                console.error(`\n❌ Error in step ${stepName}:`, error.message);
                console.error(`❌ Error stack:`, error.stack);
                console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
                throw error;
            }
        }

        throw new Error('Pipeline failed to produce output');
    }
}
