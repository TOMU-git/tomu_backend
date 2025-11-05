import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { AIChatSession } from "../entities/ai-chat-session.entity";
import { IAIChatSessionRepository } from "../interfaces/ai-chat-session.repository";
import { ID } from "src/common/types/type";
import { BaseAIRepository } from "./base-ai.repository";

@Injectable()
export class AIChatSessionRepository extends BaseAIRepository implements IAIChatSessionRepository {

    constructor(
        @InjectRepository(AIChatSession)
        private readonly aiChatSessionRepository: Repository<AIChatSession>,
    ) {
        super(AIChatSessionRepository.name);
    }

    /**
     * Yangi AI chat sessiyasini yaratish
     * @param entity - AIChatSession entity
     * @returns Yaratilgan sessiya
     */
    async create(entity: AIChatSession): Promise<AIChatSession> {
        this.debugLog(`Creating new AI chat session for user ${entity.userId} in course ${entity.courseId}`);
        return await this.aiChatSessionRepository.save(entity);
    }

    /**
     * ID bo'yicha chat sessiyasini topish
     * @param id - Sessiya ID
     * @returns Topilgan sessiya yoki null
     */
    async findOneById(id: ID): Promise<AIChatSession | null> {
        this.debugLog(`Finding AI chat session by id: ${id}`);
        return await this.aiChatSessionRepository.findOne({
            where: { id },
            relations: ["user"],
        });
    }

    /**
     * Foydalanuvchining barcha chat sessiyalarini topish
     * @param userId - Foydalanuvchi ID
     * @returns Foydalanuvchining barcha sessiyalari
     */
    async findByUserId(userId: ID): Promise<AIChatSession[]> {
        this.debugLog(`Finding all chat sessions for user: ${userId}`);
        return await this.aiChatSessionRepository.find({
            where: { userId },
            relations: ["user"],
            order: {
                lastActivityAt: "DESC"
            },
        });
    }

    /**
     * Foydalanuvchi va kurs ID bo'yicha sessiyalarni topish
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID
     * @returns Topilgan sessiyalar
     */
    async findByUserIdAndCourseId(userId: ID, courseId: ID): Promise<AIChatSession[]> {
        this.debugLog(`Finding chat sessions for user ${userId} in course ${courseId}`);
        return await this.aiChatSessionRepository.find({
            where: {
                userId,
                courseId
            },
            relations: ["user"],
            order: {
                lastActivityAt: "DESC"
            },
        });
    }

    /**
     * Foydalanuvchining faol chat sessiyalarini topish
     * @param userId - Foydalanuvchi ID
     * @returns Faol sessiyalar
     */
    async findActiveSessions(userId: ID): Promise<AIChatSession[]> {
        this.debugLog(`Finding active chat sessions for user: ${userId}`);
        return await this.aiChatSessionRepository.find({
            where: {
                userId,
                isActive: true
            },
            relations: ["user"],
            order: { lastActivityAt: "DESC" },
        });
    }

    /**
     * Foydalanuvchining oxirgi faol sessiyasini topish
     * @param userId - Foydalanuvchi ID
     * @returns Oxirgi faol sessiya yoki null
     */
    async findLastActiveSession(userId: ID): Promise<AIChatSession | null> {
        this.debugLog(`Finding last active session for user: ${userId}`);
        return await this.aiChatSessionRepository.findOne({
            where: {
                userId,
                isActive: true
            },
            relations: ["user"],
            order: { lastActivityAt: "DESC" },
        });
    }

    /**
     * Chat sessiyasini yangilash
     * @param entity - Yangilanishi kerak bo'lgan sessiya
     * @returns Yangilangan sessiya
     */
    async update(entity: AIChatSession): Promise<AIChatSession> {
        this.debugLog(`Updating AI chat session with id: ${entity.id}`);
        return await this.aiChatSessionRepository.save(entity);
    }

    /**
     * Chat sessiyasini o'chirish
     * @param id - O'chirilishi kerak bo'lgan sessiya ID
     * @returns O'chirilgan sessiya
     */
    async delete(id: ID): Promise<AIChatSession> {
        this.warnLog(`Deleting AI chat session with id: ${id}`); // Delete operatsiyasi muhim
        const entity = await this.findOneById(id);
        if (!entity) {
            this.errorLog(`AI chat session with id ${id} not found`);
            throw new Error(`AI chat session with id ${id} not found`);
        }
        await this.aiChatSessionRepository.remove(entity);
        return entity;
    }

    /**
     * Barcha chat sessiyalarini topish
     * @returns Barcha sessiyalar
     */
    async findAll(): Promise<AIChatSession[]> {
        this.debugLog("Finding all AI chat sessions");
        return await this.aiChatSessionRepository.find({
            relations: ["user"],
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Eski sessiyalarni avtomatik yopish (24 soatdan eski faol sessiyalar)
     * @param hoursAgo - Qancha soat oldingi sessiyalar yopilsin
     * @returns Yopilgan sessiyalar soni
     */
    async closeOldSessions(hoursAgo: number = 24): Promise<number> {
        this.debugLog(`Closing sessions older than ${hoursAgo} hours`);
        const cutoffTime = new Date();
        cutoffTime.setHours(cutoffTime.getHours() - hoursAgo);

        const oldSessions = await this.aiChatSessionRepository.find({
            where: {
                isActive: true,
                lastActivityAt: LessThan(cutoffTime),
            },
        });

        for (const session of oldSessions) {
            session.isActive = false;
            await this.aiChatSessionRepository.save(session);
        }

        this.debugLog(`Closed ${oldSessions.length} old sessions`);
        return oldSessions.length;
    }
}
