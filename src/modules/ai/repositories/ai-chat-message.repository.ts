import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { IAIChatMessageRepository } from "../interfaces/ai-chat-message.repository";
import { ID } from "src/common/types/type";
import { BaseAIRepository } from "./base-ai.repository";

@Injectable()
export class AIChatMessageRepository extends BaseAIRepository implements IAIChatMessageRepository {

    constructor(
        @InjectRepository(AIChatMessage)
        private readonly aiChatMessageRepository: Repository<AIChatMessage>,
    ) {
        super(AIChatMessageRepository.name);
    }

    /**
     * Yangi AI chat xabarini yaratish
     * @param entity - AIChatMessage entity
     * @returns Yaratilgan xabar
     */
    async create(entity: AIChatMessage): Promise<AIChatMessage> {
        this.debugLog(`Creating new AI chat message in session ${entity.sessionId}`);
        return await this.aiChatMessageRepository.save(entity);
    }

    /**
     * ID bo'yicha chat xabarini topish
     * @param id - Xabar ID
     * @returns Topilgan xabar yoki null
     */
    async findOneById(id: ID): Promise<AIChatMessage | null> {
        this.debugLog(`Finding AI chat message by id: ${id}`);
        return await this.aiChatMessageRepository.findOne({
            where: { id },
            relations: ["session"],
        });
    }

    /**
     * Sessiya ID bo'yicha barcha xabarlarni topish
     * @param sessionId - Sessiya ID
     * @returns Sessiyadagi barcha xabarlar
     */
    async findBySessionId(sessionId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding all messages for session: ${sessionId}`);
        // Use session relation for query since sessionId is @RelationId (virtual property)
        return await this.aiChatMessageRepository.find({
            where: { session: { id: Number(sessionId) } },
            relations: ["session"],
            order: { createdAt: "ASC" },
        });
    }

    /**
     * Sessiya ID bo'yicha tartiblangan xabarlarni topish
     * @param sessionId - Sessiya ID
     * @returns Tartiblangan xabarlar (eskidan yangigacha)
     */
    async findBySessionIdOrdered(sessionId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding ordered messages for session: ${sessionId}`);
        // Use session relation for query since sessionId is @RelationId (virtual property)
        return await this.aiChatMessageRepository.find({
            where: { session: { id: Number(sessionId) } },
            relations: ["session"],
            order: {
                createdAt: "ASC" // Eskidan yangigacha tartib
            },
        });
    }

    /**
     * Sessiyadagi oxirgi xabarni topish
     * @param sessionId - Sessiya ID
     * @returns Oxirgi xabar yoki null
     */
    async findLastMessageBySessionId(sessionId: ID): Promise<AIChatMessage | null> {
        this.debugLog(`Finding last message for session: ${sessionId}`);
        // Use session relation for query since sessionId is @RelationId (virtual property)
        return await this.aiChatMessageRepository.findOne({
            where: { session: { id: Number(sessionId) } },
            relations: ["session"],
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Foydalanuvchining barcha xabarlarini topish
     * @param userId - Foydalanuvchi ID
     * @returns Foydalanuvchining barcha xabarlari
     */
    async findByUserId(userId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding all messages for user: ${userId}`);
        return await this.aiChatMessageRepository
            .createQueryBuilder("message")
            .leftJoin("message.session", "session")
            .where("session.userId = :userId", { userId })
            .orderBy("message.createdAt", "DESC")
            .getMany();
    }

    /**
     * Chat xabarini yangilash
     * @param entity - Yangilanishi kerak bo'lgan xabar
     * @returns Yangilangan xabar
     */
    async update(entity: AIChatMessage): Promise<AIChatMessage> {
        this.debugLog(`Updating AI chat message with id: ${entity.id}`);
        return await this.aiChatMessageRepository.save(entity);
    }

    /**
     * Chat xabarini o'chirish
     * @param id - O'chirilishi kerak bo'lgan xabar ID
     * @returns O'chirilgan xabar
     */
    async delete(id: ID): Promise<AIChatMessage> {
        this.warnLog(`Deleting AI chat message with id: ${id}`); // Delete operatsiyasi muhim
        const entity = await this.findOneById(id);
        if (!entity) {
            this.errorLog(`AI chat message with id ${id} not found`);
            throw new Error(`AI chat message with id ${id} not found`);
        }
        await this.aiChatMessageRepository.remove(entity);
        return entity;
    }

    /**
     * Barcha chat xabarlarini topish
     * @returns Barcha xabarlar
     */
    async findAll(): Promise<AIChatMessage[]> {
        this.debugLog("Finding all AI chat messages");
        return await this.aiChatMessageRepository.find({
            relations: ["session"],
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Sessiyadagi xabarlar sonini hisoblash
     * @param sessionId - Sessiya ID
     * @returns Xabarlar soni
     */
    async countMessagesBySessionId(sessionId: ID): Promise<number> {
        this.debugLog(`Counting messages for session: ${sessionId}`);
        // Use session relation for query since sessionId is @RelationId (virtual property)
        return await this.aiChatMessageRepository.count({
            where: { session: { id: Number(sessionId) } },
        });
    }

    /**
     * Foydalanuvchining bugungi xabarlar sonini hisoblash
     * @param userId - Foydalanuvchi ID
     * @returns Bugungi xabarlar soni
     */
    async countTodayMessagesByUserId(userId: ID): Promise<number> {
        this.debugLog(`Counting today's messages for user: ${userId}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return await this.aiChatMessageRepository
            .createQueryBuilder("message")
            .leftJoin("message.session", "session")
            .where("session.userId = :userId", { userId })
            .andWhere("message.createdAt >= :today", { today })
            .andWhere("message.createdAt < :tomorrow", { tomorrow })
            .getCount();
    }

    /**
     * 7-modul limiti ichidagi xabarlarni topish
     * @param sessionId - Sessiya ID
     * @returns Limit ichidagi xabarlar
     */
    async findMessagesWithinLimit(sessionId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding messages within 7-module limit for session: ${sessionId}`);
        // Use session relation for query since sessionId is @RelationId (virtual property)
        return await this.aiChatMessageRepository.find({
            where: {
                session: { id: Number(sessionId) },
                isWithinLimit: true
            },
            relations: ["session"],
            order: { createdAt: "ASC" },
        });
    }
}
