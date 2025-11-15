import { Injectable, Logger, Inject } from "@nestjs/common";
import { IAIUsageCostRepository } from "../interfaces/ai-usage-cost.repository";
import { IAIChatSessionRepository } from "../interfaces/ai-chat-session.repository";
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
        @Inject("IAIChatSessionRepository")
        private readonly sessionRepository: IAIChatSessionRepository,
        private readonly costCalculator: CostCalculationService,
        private readonly dataSource: DataSource, // Transaction va lock uchun
    ) {
        // Oylik limit - environment'dan o'qiladi yoki default 2$
        this.monthlyLimit = Number(process.env.AI_MONTHLY_LIMIT) || 2.0;

        this.logger.log(`🔒 Limit Check Service initialized:`);
        this.logger.log(`   Monthly Limit: $${this.monthlyLimit} per course`);
    }

    /**
     * Oylik limit'ni tekshirish va cost hisoblash
     * Har bir kurs uchun alohida limit tekshiriladi
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID (nullable - agar null bo'lsa, umumiy chat uchun)
     * @param estimatedCost - Taxminiy cost (agar mavjud bo'lsa)
     * @returns Limit holati va qolgan summa
     */
    async checkMonthlyLimit(
        userId: ID,
        courseId: number | null,
        estimatedCost?: number
    ): Promise<{
        canProceed: boolean;
        currentCost: number;
        limit: number;
        remaining: number;
        estimatedTotal?: number;
    }> {
        const currentMonth = this.getCurrentMonth();
        const currentCost = await this.costRepository.sumMonthlyByUserAndCourse(userId, currentMonth, courseId);

        // Agar taxminiy cost berilgan bo'lsa, umumiy cost'ni hisoblaymiz
        const estimatedTotal = estimatedCost ? currentCost + estimatedCost : currentCost;
        const remaining = this.monthlyLimit - currentCost;
        const canProceed = estimatedTotal <= this.monthlyLimit;

        if (!canProceed && estimatedCost) {
            const courseInfo = courseId ? `course ${courseId}` : "general chat";
            this.logger.warn(
                `❌ Monthly limit exceeded for user ${userId}, ${courseInfo}: ` +
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
     * Har bir kurs uchun alohida limit (2$) tekshiriladi
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

        // 1. Session'dan courseId'ni olish
        const session = await this.sessionRepository.findOneById(sessionId);
        if (!session) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        const courseId = session.courseId || null; // null = umumiy chat

        // 2. Cost hisoblash
        const costBreakdown = this.costCalculator.calculateTotalCost({
            gptPromptTokens: params.gptPromptTokens,
            gptCompletionTokens: params.gptCompletionTokens,
            whisperDurationSeconds: params.whisperDurationSeconds,
            ttsCharacters: params.ttsCharacters,
        });

        // 3. Transaction bilan limit check va save
        // Bu concurrent request'larda race condition'ni oldini oladi
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 4. Database lock bilan limit tekshiruvi
            // PostgreSQL'da FOR UPDATE bilan aggregate function ishlatib bo'lmaydi
            // Shuning uchun avval row'larni lock qilamiz, keyin SUM() qilamiz
            const currentMonth = this.getCurrentMonth();

            // 4.1. Avval messageId bo'yicha mavjud record'ni tekshirish va lock qilish (upsert uchun)
            // Bu concurrent request'larda race condition'ni oldini oladi
            const existingRecord = await queryRunner.manager
                .createQueryBuilder(AIUsageCost, "cost")
                .where("cost.message_id = :messageId", { messageId: Number(messageId) })
                .setLock("pessimistic_write") // Lock qilish
                .getOne();

            // 4.2. Avval sessionId orqali courseId'ga tegishli cost recordlarni lock qilish
            // JOIN qilib courseId'ga mos keladigan recordlarni lock qilamiz
            if (courseId === null) {
                await queryRunner.manager.query(
                    `SELECT cost.id FROM ai_usage_costs cost
                     INNER JOIN ai_chat_sessions session ON session.id = cost.session_id
                     WHERE cost.user_id = $1 AND cost.month = $2 AND session.course_id IS NULL
                     FOR UPDATE`,
                    [Number(userId), currentMonth]
                );
            } else {
                await queryRunner.manager.query(
                    `SELECT cost.id FROM ai_usage_costs cost
                     INNER JOIN ai_chat_sessions session ON session.id = cost.session_id
                     WHERE cost.user_id = $1 AND cost.month = $2 AND session.course_id = $3
                     FOR UPDATE`,
                    [Number(userId), currentMonth, Number(courseId)]
                );
            }

            // 4.3. Keyin SUM() qilish - courseId bo'yicha
            let currentCost;
            if (courseId === null) {
                currentCost = await queryRunner.manager.query(
                    `SELECT COALESCE(SUM(cost.total_cost), 0) as total 
                     FROM ai_usage_costs cost
                     INNER JOIN ai_chat_sessions session ON session.id = cost.session_id
                     WHERE cost.user_id = $1 AND cost.month = $2 AND session.course_id IS NULL`,
                    [Number(userId), currentMonth]
                );
            } else {
                currentCost = await queryRunner.manager.query(
                    `SELECT COALESCE(SUM(cost.total_cost), 0) as total 
                     FROM ai_usage_costs cost
                     INNER JOIN ai_chat_sessions session ON session.id = cost.session_id
                     WHERE cost.user_id = $1 AND cost.month = $2 AND session.course_id = $3`,
                    [Number(userId), currentMonth, Number(courseId)]
                );
            }

            const currentCostValue = parseFloat(currentCost[0]?.total || "0");
            
            // 4.4. Agar mavjud record bo'lsa, eski cost'ni ayirib, yangi cost'ni qo'shamiz
            // Bu limit check'ni to'g'ri qilish uchun zarur
            const oldCostValue = existingRecord ? parseFloat(String(existingRecord.totalCost || "0")) : 0;
            const adjustedCurrentCost = currentCostValue - oldCostValue; // Eski cost'ni ayirish
            const estimatedTotal = adjustedCurrentCost + costBreakdown.totalCost;

            // 5. Limit tekshiruvi (har bir kurs uchun alohida)
            if (estimatedTotal > this.monthlyLimit) {
                await queryRunner.rollbackTransaction();
                throw new LimitExceededException({
                    currentCost: this.roundToSixDecimals(adjustedCurrentCost),
                    limit: this.monthlyLimit,
                    remaining: this.roundToSixDecimals(Math.max(0, this.monthlyLimit - adjustedCurrentCost)),
                    courseId: courseId,
                    month: currentMonth,
                });
            }

            // 6. Cost record yaratish yoki yangilash (upsert)
            let costRecord: AIUsageCost;
            if (existingRecord) {
                // Mavjud record'ni yangilash
                this.logger.debug(
                    `🔄 Updating existing cost record for messageId ${messageId}, ` +
                    `old cost: $${oldCostValue.toFixed(6)}, new cost: $${costBreakdown.totalCost.toFixed(6)}`
                );
                costRecord = existingRecord;
            } else {
                // Yangi record yaratish
                this.logger.debug(`✨ Creating new cost record for messageId ${messageId}`);
                costRecord = new AIUsageCost();
            }

            // Ma'lumotlarni to'ldirish/yangilash
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

            // 7. Database'ga saqlash (transaction ichida) - save() avtomatik ravishda update yoki create qiladi
            await queryRunner.manager.save(AIUsageCost, costRecord);

            // 8. Transaction commit
            await queryRunner.commitTransaction();

            const finalCost = adjustedCurrentCost + costBreakdown.totalCost;

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

    /**
     * To'lov qilinganda AI limitni yangilash
     * Shu kurs uchun o'sha oydagi barcha cost recordlarni o'chirish
     * Bu user'ga yangi 2$ limit beradi
     * 
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID (nullable - agar null bo'lsa, umumiy chat uchun)
     */
    async resetAILimitForCourse(userId: ID, courseId: number | null): Promise<void> {
        const currentMonth = this.getCurrentMonth();

        this.logger.log(
            `🔄 Resetting AI limit for user ${userId}, courseId ${courseId || 'null'}, month ${currentMonth}`
        );

        try {
            await this.costRepository.deleteByUserCourseAndMonth(userId, courseId, currentMonth);

            const courseInfo = courseId ? `course ${courseId}` : "general chat";
            this.logger.log(
                `✅ AI limit reset successfully for user ${userId}, ${courseInfo}, month ${currentMonth}. ` +
                `User now has fresh $${this.monthlyLimit} limit.`
            );
        } catch (error: any) {
            this.logger.error(
                `❌ Error resetting AI limit for user ${userId}, courseId ${courseId || 'null'}:`,
                error
            );
            throw error;
        }
    }
}



