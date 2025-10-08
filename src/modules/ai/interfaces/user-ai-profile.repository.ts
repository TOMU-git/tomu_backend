import { UserAIProfile } from "../entities/user-ai-profile.entity";
import { ID } from "src/common/types/type";

export interface IUserAIProfileRepository {
    create(entity: UserAIProfile): Promise<UserAIProfile>;
    findOneById(id: ID): Promise<UserAIProfile | null>;
    findByUserId(userId: ID): Promise<UserAIProfile | null>;
    update(entity: UserAIProfile): Promise<UserAIProfile>;
    delete(id: ID): Promise<UserAIProfile>;
    findAll(): Promise<UserAIProfile[]>;
}
