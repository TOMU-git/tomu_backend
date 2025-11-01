import { Injectable, Logger, Inject } from "@nestjs/common";
import { IAIUsageCostRepository } from "../interfaces/ai-usage-cost.repository";
import { CostCalculationService } from "./cost-calculation.service";
import { LimitExceededException } from "../exceptions/limit-exceeded.exception";
import { ID } from "src/common/types/type";

/**
 * LimitCheckService
 * -------------------------------------------------------
 * Maqsad: Oylik limit (2$) tekshiruvi va cost tracking.
 * 
 * Asosiy funksiyalar:
 *  - Oylik limit tekshiruvi (2$)
 *  - Cost hisoblash va database'ga saqlash
 *  - Foydalanuvchi uchun qolgan limit'ni qaytarish
 * 
 * Environment variables:
 *  - AI_MONTHLY_LIMIT: Oylik limit (default: 2.0 USD)
 */
@Injectable()
export class LimitCheckService {
    private readonly logger = new Logger(LimitCheckService.name);
    private readonly monthlyLimit: number;

    constructor(
        @Inject("IAIUsageCostRepository")
        private readonly costRepository: IAIUsageCostRepository,
        private readonly costCalculator: CostCalculationService,
    ) {
        // Oylik limit - environment'dan o'qiladi yoki default 2$
        this.monthlyLimit = Number(process.env.AI_MONTHLY_LIMIT) || 2.0;

        this.logger.log(`🔒 Limit Check Service initialized:`);
        this.logger.log(`   Monthly Limit: $${this.monthlyLimit}`);
    }

    /**
     * Oylik limit'ni tekshirish va cost hisoblash
     * @param userId - Foydalanuvchi ID
     * @param estimatedCost - Taxminiy cost (agar mavjud bo'lsa)
     * @returns Limit holati va qolgan summa
     */
    async checkMonthlyLimit(
        userId: ID,
        estimatedCost?: number
    ): Promise<{
        canProceed: boolean;
        currentCost: number;
        limit: number;
        remaining: number;
        estimatedTotal?: number;
    }> {
        const currentMonth = this.getCurrentMonth();
        const currentCost = await this.costRepository.sumMonthlyByUser(userId, currentMonth);

        // Agar taxminiy cost berilgan bo'lsa, umumiy cost'ni hisoblaymiz
        const estimatedTotal = estimatedCost ? currentCost + estimatedCost : currentCost;
        const remaining = this.monthlyLimit - currentCost;
        const canProceed = estimatedTotal <= this.monthlyLimit;

        this.logger.debug(
            `Monthly limit check for user ${userId}, month ${currentMonth}: ` +
            `current=$${currentCost.toFixed(6)}, limit=$${this.monthlyLimit}, ` +
            `remaining=$${remaining.toFixed(6)}, canProceed=${canProceed}`
        );

        if (!canProceed && estimatedCost) {
            this.logger.warn(
                `❌ Monthly limit exceeded for user ${userId}: ` +
                `current=$${currentCost.toFixed(6)}, requested=$${estimatedCost.toFixed(6)}, ` +
                `total=$${estimatedTotal.toFixed(6)}, limit=$${this.monthlyLimit}`
            );
        }

        return {
            canProceed,
            currentCost: this.roundToSixDecimals(currentCost),
            limit: this.monthlyLimit,
            remaining: this.roundToSixDecimals(Math.max(0, remaining)),
            estimatedTotal: estimatedCost ? this.roundToSixDecimals(estimatedTotal) : undefined,
        };
    }

    /**
     * Cost'ni database'ga saqlash va limit tekshiruvi
     * @param params - Cost ma'lumotlari
     * @throws LimitExceededException - Agar limit oshib ketsa
     */
    async saveCostAndCheckLimit(params: {
        userId: ID;
        sessionId: ID;
        messageId: ID;
        gptPromptTokens?: number;
        gptCompletionTokens?: number;
        whisperDurationSeconds?: number;
        ttsCharacters?: number;
    }): Promise<{
        cost: {
            gptCost: number;
            whisperCost: number;
            ttsCost: number;
            totalCost: number;
        };
        limitStatus: {
            currentCost: number;
            limit: number;
            remaining: number;
        };
    }> {
        const { userId, sessionId, messageId } = params;

        // 1. Cost hisoblash
        const costBreakdown = this.costCalculator.calculateTotalCost({
            gptPromptTokens: params.gptPromptTokens,
            gptCompletionTokens: params.gptCompletionTokens,
            whisperDurationSeconds: params.whisperDurationSeconds,
            ttsCharacters: params.ttsCharacters,
        });

        // 2. Limit tekshiruvi (taxminiy cost bilan)
        const limitCheck = await this.checkMonthlyLimit(userId, costBreakdown.totalCost);

        // 3. Agar limit oshib ketsa, exception tashlash
        if (!limitCheck.canProceed) {
            throw new LimitExceededException(
                `Oylik limit oshib ketdi. Hozirgi sarflangan: $${limitCheck.currentCost.toFixed(2)}, ` +
                `So'ralgan: $${costBreakdown.totalCost.toFixed(2)}, ` +
                `Jami: $${limitCheck.estimatedTotal!.toFixed(2)}, Limit: $${this.monthlyLimit}. ` +
                `Qolgan: $${limitCheck.remaining.toFixed(2)}`
            );
        }

        // 4. Database'ga saqlash
        const currentMonth = this.getCurrentMonth();
        const costRecord = {
            userId: Number(userId),
            sessionId: Number(sessionId),
            messageId: Number(messageId),
            gptCost: costBreakdown.gptCost,
            whisperCost: costBreakdown.whisperCost,
            ttsCost: costBreakdown.ttsCost,
            totalCost: costBreakdown.totalCost,
            gptPromptTokens: params.gptPromptTokens,
            gptCompletionTokens: params.gptCompletionTokens,
            gptTotalTokens: (params.gptPromptTokens || 0) + (params.gptCompletionTokens || 0),
            whisperDurationSeconds: params.whisperDurationSeconds,
            ttsCharacters: params.ttsCharacters,
            month: currentMonth,
        } as any; // TypeORM entity type

        await this.costRepository.create(costRecord);

        this.logger.log(
            `✅ Cost saved for user ${userId}, session ${sessionId}, message ${messageId}: ` +
            `$${costBreakdown.totalCost.toFixed(6)} (GPT: $${costBreakdown.gptCost.toFixed(6)}, ` +
            `Whisper: $${costBreakdown.whisperCost.toFixed(6)}, TTS: $${costBreakdown.ttsCost.toFixed(6)})`
        );

        return {
            cost: costBreakdown,
            limitStatus: {
                currentCost: limitCheck.currentCost + costBreakdown.totalCost,
                limit: this.monthlyLimit,
                remaining: Math.max(0, this.monthlyLimit - (limitCheck.currentCost + costBreakdown.totalCost)),
            },
        };
    }

    /**
     * Hozirgi oy'ni olish ("2024-01" formatida)
     */
    private getCurrentMonth(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    }

    /**
     * Cost'ni 6 o'nlik xonaga yaxlitlash
     */
    private roundToSixDecimals(value: number): number {
        return Math.round(value * 1000000) / 1000000;
    }
}



