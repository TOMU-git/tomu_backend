import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AIUsageCost } from "../entities/ai-usage-cost.entity";
import { IAIUsageCostRepository } from "../interfaces/ai-usage-cost.repository";
import { ID } from "src/common/types/type";
import { BaseAIRepository } from "./base-ai.repository";

/**
 * AIUsageCostRepository
 * -------------------------------------------------------
 * Maqsad: AI usage cost tracking uchun repository implementation.
 * 
 * Asosiy funksiyalar:
 *  - Cost recordlarni saqlash
 *  - Oylik cost sum'larini hisoblash (performance uchun index'lar ishlatiladi)
 *  - Foydalanuvchi tarixini olish
 */
@Injectable()
export class AIUsageCostRepository extends BaseAIRepository implements IAIUsageCostRepository {

    constructor(
        @InjectRepository(AIUsageCost)
        private readonly aiUsageCostRepository: Repository<AIUsageCost>,
    ) {
        super(AIUsageCostRepository.name);
    }

    /**
     * Yangi cost record yaratish
     */
    async create(entity: AIUsageCost): Promise<AIUsageCost> {
        this.debugLog(`Creating cost record for user ${entity.userId}, session ${entity.sessionId}, month ${entity.month}`);
        return await this.aiUsageCostRepository.save(entity);
    }

    /**
     * Foydalanuvchi uchun oylik umumiy cost'ni hisoblash
     * Performance: userId + month composite index ishlatiladi
     */
    async sumMonthlyByUser(userId: ID, month: string): Promise<number> {
        this.debugLog(`Calculating monthly cost for user ${userId}, month ${month}`);

        const result = await this.aiUsageCostRepository
            .createQueryBuilder("cost")
            .select("COALESCE(SUM(cost.total_cost), 0)", "total")
            .where("cost.user_id = :userId", { userId: Number(userId) })
            .andWhere("cost.month = :month", { month })
            .getRawOne();

        const total = parseFloat(result?.total || "0");
        this.debugLog(`Monthly cost for user ${userId}, month ${month}: $${total.toFixed(6)}`);

        return total;
    }

    /**
     * Foydalanuvchi va kurs uchun oylik umumiy cost'ni hisoblash
     * sessionId orqali courseId'ni aniqlaydi (JOIN qilib)
     * Performance: userId + month index va sessionId JOIN ishlatiladi
     */
    async sumMonthlyByUserAndCourse(userId: ID, month: string, courseId: number | null): Promise<number> {
        this.debugLog(`Calculating monthly cost for user ${userId}, month ${month}, courseId ${courseId || 'null'}`);

        const queryBuilder = this.aiUsageCostRepository
            .createQueryBuilder("cost")
            .innerJoin("ai_chat_sessions", "session", "session.id = cost.session_id")
            .select("COALESCE(SUM(cost.total_cost), 0)", "total")
            .where("cost.user_id = :userId", { userId: Number(userId) })
            .andWhere("cost.month = :month", { month });

        if (courseId === null) {
            // Umumiy chat uchun (courseId NULL bo'lgan sessionlar)
            queryBuilder.andWhere("session.course_id IS NULL");
        } else {
            // Muayyan kurs uchun
            queryBuilder.andWhere("session.course_id = :courseId", { courseId: Number(courseId) });
        }

        const result = await queryBuilder.getRawOne();

        const total = parseFloat(result?.total || "0");
        this.debugLog(`Monthly cost for user ${userId}, month ${month}, courseId ${courseId || 'null'}: $${total.toFixed(6)}`);

        return total;
    }

    /**
     * Foydalanuvchi va oy bo'yicha barcha cost recordlarni olish
     */
    async findByUserAndMonth(userId: ID, month: string): Promise<AIUsageCost[]> {
        this.debugLog(`Finding cost records for user ${userId}, month ${month}`);
        return await this.aiUsageCostRepository.find({
            where: {
                userId: Number(userId),
                month,
            },
            order: {
                createdAt: "DESC", // Yangi recordlar birinchi
            },
        });
    }

    /**
     * Foydalanuvchi uchun barcha cost recordlarni olish (tarix)
     */
    async findByUserId(userId: ID): Promise<AIUsageCost[]> {
        this.debugLog(`Finding all cost records for user ${userId}`);
        return await this.aiUsageCostRepository.find({
            where: {
                userId: Number(userId),
            },
            order: {
                createdAt: "DESC", // Yangi recordlar birinchi
            },
        });
    }

    /**
     * ID bo'yicha bitta record topish
     */
    async findOneById(id: ID): Promise<AIUsageCost | null> {
        this.debugLog(`Finding cost record by id: ${id}`);
        return await this.aiUsageCostRepository.findOne({
            where: { id: Number(id) },
        });
    }

    /**
     * messageId bo'yicha bitta record topish
     * Upsert operatsiyasi uchun ishlatiladi
     */
    async findOneByMessageId(messageId: ID): Promise<AIUsageCost | null> {
        this.debugLog(`Finding cost record by messageId: ${messageId}`);
        return await this.aiUsageCostRepository.findOne({
            where: { messageId: Number(messageId) },
        });
    }

    /**
     * Barcha recordlarni olish (admin uchun)
     */
    async findAll(): Promise<AIUsageCost[]> {
        this.debugLog("Finding all cost records");
        return await this.aiUsageCostRepository.find({
            order: {
                createdAt: "DESC",
            },
        });
    }

    /**
     * Foydalanuvchi va kurs uchun o'sha oydagi barcha cost recordlarni o'chirish
     * To'lov qilinganda limitni yangilash uchun ishlatiladi
     * sessionId orqali courseId'ni aniqlaydi (JOIN qilib)
     */
    async deleteByUserCourseAndMonth(userId: ID, courseId: number | null, month: string): Promise<void> {
        this.debugLog(`Deleting cost records for user ${userId}, courseId ${courseId || 'null'}, month ${month}`);

        const queryBuilder = this.aiUsageCostRepository
            .createQueryBuilder("cost")
            .innerJoin("ai_chat_sessions", "session", "session.id = cost.session_id")
            .where("cost.user_id = :userId", { userId: Number(userId) })
            .andWhere("cost.month = :month", { month });

        if (courseId === null) {
            // Umumiy chat uchun (courseId NULL bo'lgan sessionlar)
            queryBuilder.andWhere("session.course_id IS NULL");
        } else {
            // Muayyan kurs uchun
            queryBuilder.andWhere("session.course_id = :courseId", { courseId: Number(courseId) });
        }

        const recordsToDelete = await queryBuilder.getMany();

        if (recordsToDelete.length > 0) {
            await this.aiUsageCostRepository.remove(recordsToDelete);
            this.debugLog(`Deleted ${recordsToDelete.length} cost records for user ${userId}, courseId ${courseId || 'null'}, month ${month}`);
        } else {
            this.debugLog(`No cost records found to delete for user ${userId}, courseId ${courseId || 'null'}, month ${month}`);
        }
    }
}



