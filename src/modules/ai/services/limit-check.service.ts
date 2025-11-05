import { Injectable, Logger, Inject } from "@nestjs/common";
import { IAIUsageCostRepository } from "../interfaces/ai-usage-cost.repository";
import { CostCalculationService } from "./cost-calculation.service";
import { LimitExceededException } from "../exceptions/limit-exceeded.exception";
import { ID } from "src/common/types/type";
import { DataSource } from "typeorm";
import { AIUsageCost } from "../entities/ai-usage-cost.entity";

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
        private readonly dataSource: DataSource, // Transaction va lock uchun
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
     * Transaction va database lock bilan race condition'ni oldini oladi
     * 
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

        // 2. Transaction bilan limit check va save
        // Bu concurrent request'larda race condition'ni oldini oladi
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 3. Database lock bilan limit tekshiruvi
            // SELECT FOR UPDATE bilan user row'ni lock qilamiz
            const currentMonth = this.getCurrentMonth();
            const currentCost = await queryRunner.manager.query(
                `SELECT COALESCE(SUM(total_cost), 0) as total 
                 FROM ai_usage_costs 
                 WHERE user_id = $1 AND month = $2 
                 FOR UPDATE`,
                [Number(userId), currentMonth]
            );

            const currentCostValue = parseFloat(currentCost[0]?.total || "0");
            const estimatedTotal = currentCostValue + costBreakdown.totalCost;

            // 4. Limit tekshiruvi
            if (estimatedTotal > this.monthlyLimit) {
                await queryRunner.rollbackTransaction();
                throw new LimitExceededException(
                    `Oylik limit oshib ketdi. Hozirgi sarflangan: $${this.roundToSixDecimals(currentCostValue).toFixed(2)}, ` +
                    `So'ralgan: $${costBreakdown.totalCost.toFixed(2)}, ` +
                    `Jami: $${this.roundToSixDecimals(estimatedTotal).toFixed(2)}, Limit: $${this.monthlyLimit}. ` +
                    `Qolgan: $${this.roundToSixDecimals(Math.max(0, this.monthlyLimit - currentCostValue)).toFixed(2)}`
                );
            }

            // 5. Cost record yaratish
            const costRecord = new AIUsageCost();
            costRecord.userId = Number(userId);
            costRecord.sessionId = Number(sessionId);
            costRecord.messageId = Number(messageId);
            costRecord.gptCost = costBreakdown.gptCost;
            costRecord.whisperCost = costBreakdown.whisperCost;
            costRecord.ttsCost = costBreakdown.ttsCost;
            costRecord.totalCost = costBreakdown.totalCost;
            costRecord.gptPromptTokens = params.gptPromptTokens;
            costRecord.gptCompletionTokens = params.gptCompletionTokens;
            costRecord.gptTotalTokens = (params.gptPromptTokens || 0) + (params.gptCompletionTokens || 0);
            costRecord.whisperDurationSeconds = params.whisperDurationSeconds;
            costRecord.ttsCharacters = params.ttsCharacters;
            costRecord.month = currentMonth;

            // 6. Database'ga saqlash (transaction ichida)
            await queryRunner.manager.save(AIUsageCost, costRecord);

            // 7. Transaction commit
            await queryRunner.commitTransaction();

            const finalCost = currentCostValue + costBreakdown.totalCost;

            this.logger.log(
                `✅ Cost saved for user ${userId}, session ${sessionId}, message ${messageId}: ` +
                `$${costBreakdown.totalCost.toFixed(6)} (GPT: $${costBreakdown.gptCost.toFixed(6)}, ` +
                `Whisper: $${costBreakdown.whisperCost.toFixed(6)}, TTS: $${costBreakdown.ttsCost.toFixed(6)})`
            );

            return {
                cost: costBreakdown,
                limitStatus: {
                    currentCost: this.roundToSixDecimals(finalCost),
                    limit: this.monthlyLimit,
                    remaining: Math.max(0, this.monthlyLimit - finalCost),
                },
            };
        } catch (error: any) {
            // Transaction rollback
            await queryRunner.rollbackTransaction();

            // LimitExceededException'ni re-throw qilish
            if (error instanceof LimitExceededException) {
                throw error;
            }

            // Boshqa xatolar uchun log va re-throw
            this.logger.error(`❌ Error saving cost for user ${userId}:`, error);
            throw error;
        } finally {
            // QueryRunner'ni release qilish
            await queryRunner.release();
        }
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



