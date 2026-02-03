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
     * ✅ Soddalashtirilgan versiya - faqat sessionId bilan ishlaydi
     */
    async create(entity: AIChatMessage): Promise<AIChatMessage> {
        // Validation
        if (!entity.sessionId || typeof entity.sessionId !== 'number') {
            throw new Error(`[AI Chat Repository] Invalid sessionId: ${entity.sessionId}`);
        }

        // ✅ To'g'ridan-to'g'ri INSERT - QueryBuilder bilan
        const result = await this.aiChatMessageRepository
            .createQueryBuilder()
            .insert()
            .into(AIChatMessage)
            .values({
                sessionId: entity.sessionId,
                senderType: entity.senderType,
                originalText: entity.originalText || null,
                aiResponseText: entity.aiResponseText || null,
                aiResponseUzbek: entity.aiResponseUzbek || null,
                audioUrl: entity.audioUrl || null,
                audioDuration: entity.audioDuration || null, // Audio duration
                isWithinLimit: entity.isWithinLimit ?? true,
            })
            .returning('*')
            .execute();

        const savedId = result.identifiers[0].id;

        // Saved message'ni qaytarish
        const saved = await this.aiChatMessageRepository.findOne({
            where: { id: savedId }
        });

        if (!saved) {
            throw new Error(`[AI Chat Repository] Failed to retrieve saved message with id ${savedId}`);
        }

        return saved;
    }

    /**
     * ID bo'yicha chat xabarini topish
     */
    async findOneById(id: ID): Promise<AIChatMessage | null> {
        this.debugLog(`Finding AI chat message by id: ${id}`);
        return await this.aiChatMessageRepository.findOne({
            where: { id }
        });
    }

    /**
     * Sessiya ID bo'yicha barcha xabarlarni topish
     */
    async findBySessionId(sessionId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding all messages for session: ${sessionId}`);
        return await this.aiChatMessageRepository
            .createQueryBuilder('message')
            .where('message.sessionId = :sessionId', { sessionId: Number(sessionId) })
            .orderBy('message.createdAt', 'ASC')
            .getMany();
    }

    /**
     * Sessiya ID bo'yicha tartiblangan xabarlarni topish
     */
    async findBySessionIdOrdered(sessionId: ID): Promise<AIChatMessage[]> {
        const messages = await this.aiChatMessageRepository
            .createQueryBuilder('message')
            .where('message.sessionId = :sessionId', { sessionId: Number(sessionId) })
            .orderBy('message.createdAt', 'ASC')
            .getMany();

        return messages;
    }

    /**
     * Sessiyadagi oxirgi xabarni topish
     */
    async findLastMessageBySessionId(sessionId: ID): Promise<AIChatMessage | null> {
        this.debugLog(`Finding last message for session: ${sessionId}`);
        return await this.aiChatMessageRepository.findOne({
            where: { sessionId: Number(sessionId) },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Foydalanuvchining barcha xabarlarini topish
     */
    async findByUserId(userId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding all messages for user: ${userId}`);
        // Bu metod uchun session table bilan join qilish kerak
        // Lekin hozircha soddalashtirilgan versiya
        return await this.aiChatMessageRepository.find({
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Chat xabarini yangilash
     */
    async update(entity: AIChatMessage): Promise<AIChatMessage> {
        this.debugLog(`Updating AI chat message with id: ${entity.id}`);
        return await this.aiChatMessageRepository.save(entity);
    }

    /**
     * Chat xabarini o'chirish
     */
    async delete(id: ID): Promise<AIChatMessage> {
        this.warnLog(`Deleting AI chat message with id: ${id}`);
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
     */
    async findAll(): Promise<AIChatMessage[]> {
        this.debugLog("Finding all AI chat messages");
        return await this.aiChatMessageRepository.find({
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Sessiyadagi xabarlar sonini hisoblash
     */
    async countMessagesBySessionId(sessionId: ID): Promise<number> {
        this.debugLog(`Counting messages for session: ${sessionId}`);
        return await this.aiChatMessageRepository.count({
            where: { sessionId: Number(sessionId) }
        });
    }

    /**
     * Foydalanuvchining bugungi xabarlar sonini hisoblash
     */
    async countTodayMessagesByUserId(userId: ID): Promise<number> {
        this.debugLog(`Counting today's messages for user: ${userId}`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return await this.aiChatMessageRepository
            .createQueryBuilder("message")
            .where("message.createdAt >= :today", { today })
            .andWhere("message.createdAt < :tomorrow", { tomorrow })
            .getCount();
    }

    /**
     * 7-modul limiti ichidagi xabarlarni topish
     */
    async findMessagesWithinLimit(sessionId: ID): Promise<AIChatMessage[]> {
        this.debugLog(`Finding messages within 7-module limit for session: ${sessionId}`);
        return await this.aiChatMessageRepository.find({
            where: {
                sessionId: Number(sessionId),
                isWithinLimit: true
            },
            order: { createdAt: "ASC" },
        });
    }
}
