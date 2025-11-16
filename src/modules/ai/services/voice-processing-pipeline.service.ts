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
        private readonly sttStep: STTStep, // Inject STTStep
        private readonly validationStep: ValidationStep, // Inject ValidationStep
        private readonly contextStep: ContextStep, // Inject ContextStep
        private readonly gptStep: GPTStep, // Inject GPTStep
        private readonly responseStep: ResponseStep, // Inject ResponseStep
    ) { }

    /**
     * Pipeline ni bajarish (text bilan - STT bosqichini o'tkazib yuboradi)
     * Cleanup logic bilan - xato bo'lganda yaratilgan resurslarni tozalash
     */
    async executeWithText(input: VoiceInput & { transcribedText: string }): Promise<VoiceOutput> {
        const pipelineStart = Date.now();

        // Usage tracking uchun initializatsiya
        const inputWithUsage: VoiceInput = {
            ...input,
            usage: {},
        };

        // Cleanup tracking
        const cleanupResources: Array<{ type: string; resource: any; cleanup: () => Promise<void> }> = [];

        // STT bosqichini o'tkazib yuboramiz, to'g'ridan-to'g'ri Validation bosqichidan boshlaymiz
        const steps: PipelineStep[] = [
            this.validationStep, // Use injected ValidationStep
            this.contextStep, // Use injected ContextStep
            this.gptStep, // Use injected GPTStep
            this.responseStep, // Use injected ResponseStep
        ];

        let currentInput: VoiceInput | VoiceOutput = inputWithUsage;
        let executedSteps: PipelineStep[] = [];

        try {
            for (const step of steps) {
                const stepName = step.constructor.name;

                try {
                    currentInput = await step.execute(currentInput as VoiceInput);
                    executedSteps.push(step);

                    // Agar step VoiceOutput qaytarsa, pipeline tugadi
                    if ('message' in currentInput) {
                        const output = currentInput as VoiceOutput;
                        const usage = (currentInput as any).usage || inputWithUsage.usage || {};
                        const totalTime = Date.now() - pipelineStart;
                        // transcribedText ni output'ga qo'shish
                        const transcribedText = (currentInput as any).validatedText || (currentInput as any).transcribedText || inputWithUsage.transcribedText;

                        return {
                            ...output,
                            usage,
                            transcribedText,
                        } as VoiceOutput & { usage?: VoiceInput['usage']; transcribedText?: string };
                    }
                } catch (stepError: any) {
                    console.error(`\n❌ Error in step ${stepName}:`, stepError.message);
                    await this.cleanupResources(cleanupResources, executedSteps);
                    throw stepError;
                }
            }

            throw new Error('Pipeline failed to produce output');
        } catch (error: any) {
            console.error(`\n❌ Pipeline error:`, error.message);
            await this.cleanupResources(cleanupResources, executedSteps);
            throw error;
        }
    }

    /**
     * Pipeline ni bajarish
     * Cleanup logic bilan - xato bo'lganda yaratilgan resurslarni tozalash
     */
    async execute(input: VoiceInput): Promise<VoiceOutput> {
        const pipelineStart = Date.now();
        // console.log("\n⏱️  Pipeline boshlandi...");

        // Usage tracking uchun initializatsiya
        const inputWithUsage: VoiceInput = {
            ...input,
            usage: {},
        };

        // Cleanup tracking - xato bo'lganda tozalash uchun
        const cleanupResources: Array<{ type: string; resource: any; cleanup: () => Promise<void> }> = [];

        const steps: PipelineStep[] = [
            this.sttStep, // Use injected STTStep
            this.validationStep, // Use injected ValidationStep
            this.contextStep, // Use injected ContextStep
            this.gptStep, // Use injected GPTStep
            this.responseStep, // Use injected ResponseStep
        ];

        let currentInput: VoiceInput | VoiceOutput = inputWithUsage;
        let executedSteps: PipelineStep[] = [];

        try {
            for (const step of steps) {
                const stepName = step.constructor.name;
                // console.log(`\n🔄 Executing step: ${stepName}`);

                try {
                    currentInput = await step.execute(currentInput as VoiceInput);
                    // console.log(`✅ Step ${stepName} completed successfully`);
                    executedSteps.push(step);

                    // Agar step VoiceOutput qaytarsa, pipeline tugadi
                    if ('message' in currentInput) {
                        const output = currentInput as VoiceOutput;

                        // Usage ma'lumotlarini olish
                        const usage = (currentInput as any).usage || inputWithUsage.usage || {};

                        const totalTime = Date.now() - pipelineStart;
                        // console.log(`\n✅ Pipeline tugadi. Umumiy vaqt: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)\n`);

                        // transcribedText ni output'ga qo'shish
                        const transcribedText = (currentInput as any).validatedText || (currentInput as any).transcribedText || inputWithUsage.transcribedText;

                        // Usage ma'lumotlarini output'ga qo'shish (keyin trackCost'da ishlatish uchun)
                        return {
                            ...output,
                            usage, // Usage ma'lumotlarini qo'shish
                            transcribedText, // Foydalanuvchi xabarini saqlash uchun
                        } as VoiceOutput & { usage?: VoiceInput['usage']; transcribedText?: string };
                    }
                } catch (stepError: any) {
                    // Step xatosi - cleanup qilish va re-throw
                    console.error(`\n❌ Error in step ${stepName}:`, stepError.message);
                    console.error(`❌ Error stack:`, stepError.stack);

                    // Cleanup - barcha yaratilgan resurslarni tozalash
                    await this.cleanupResources(cleanupResources, executedSteps);

                    throw stepError;
                }
            }

            throw new Error('Pipeline failed to produce output');
        } catch (error: any) {
            // Pipeline xatosi - cleanup qilish
            console.error(`\n❌ Pipeline error:`, error.message);
            await this.cleanupResources(cleanupResources, executedSteps);
            throw error;
        }
    }

    /**
     * Yaratilgan resurslarni tozalash (cleanup)
     * Xato bo'lganda chaqiriladi
     */
    private async cleanupResources(
        cleanupResources: Array<{ type: string; resource: any; cleanup: () => Promise<void> }>,
        executedSteps: PipelineStep[]
    ): Promise<void> {
        if (cleanupResources.length === 0 && executedSteps.length === 0) {
            return; // Tozalash uchun hech narsa yo'q
        }

        // console.log(`\n🧹 Cleaning up resources... (${cleanupResources.length} resources, ${executedSteps.length} steps executed)`);

        // Cleanup resources'ni teskari tartibda tozalash (oxirgi yaratilgan birinchi)
        for (let i = cleanupResources.length - 1; i >= 0; i--) {
            const resource = cleanupResources[i];
            try {
                await resource.cleanup();
                // console.log(`   ✅ Cleaned up ${resource.type}`);
            } catch (cleanupError: any) {
                console.error(`   ⚠️  Cleanup error for ${resource.type}:`, cleanupError.message);
                // Cleanup xatosi pipeline xatosini to'xtatmaydi
            }
        }

        // ResponseStep'da yaratilgan audio fayllarni tozalash
        // Agar ResponseStep ishlagan bo'lsa, audio fayl yaratilgan bo'lishi mumkin
        const responseStepExecuted = executedSteps.some(step => step.constructor.name === 'ResponseStep');
        if (responseStepExecuted) {
            // Audio fayllarni tozalash - bu yerda faqat log qilamiz
            // Haqiqiy fayl o'chirish kerak bo'lsa, audioUrl'ni track qilish kerak
            // console.log(`   ℹ️  ResponseStep executed - audio files may need cleanup (not implemented)`);
        }

        // console.log(`✅ Cleanup completed\n`);
    }
}
