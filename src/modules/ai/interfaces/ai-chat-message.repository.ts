import { AIChatMessage } from "../entities/ai-chat-message.entity";
import { ID } from "src/common/types/type";

export interface IAIChatMessageRepository {
    create(entity: AIChatMessage): Promise<AIChatMessage>;
    findOneById(id: ID): Promise<AIChatMessage | null>;
    findBySessionId(sessionId: ID): Promise<AIChatMessage[]>;
    findBySessionIdOrdered(sessionId: ID): Promise<AIChatMessage[]>;
    findLastMessageBySessionId(sessionId: ID): Promise<AIChatMessage | null>;
    findByUserId(userId: ID): Promise<AIChatMessage[]>;
    update(entity: AIChatMessage): Promise<AIChatMessage>;
    delete(id: ID): Promise<AIChatMessage>;
    findAll(): Promise<AIChatMessage[]>;
}
