import { AIChatSession } from "../entities/ai-chat-session.entity";
import { ID } from "src/common/types/type";

export interface IAIChatSessionRepository {
    create(entity: AIChatSession): Promise<AIChatSession>;
    findOneById(id: ID): Promise<AIChatSession | null>;
    findByUserId(userId: ID): Promise<AIChatSession[]>;
    findByUserIdAndCourseId(userId: ID, courseId: ID): Promise<AIChatSession[]>;
    findActiveSessions(userId: ID): Promise<AIChatSession[]>;
    findLastActiveSession(userId: ID): Promise<AIChatSession | null>;
    update(entity: AIChatSession): Promise<AIChatSession>;
    delete(id: ID): Promise<AIChatSession>;
    findAll(): Promise<AIChatSession[]>;
}
