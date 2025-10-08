import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserAIProfile } from "../entities/user-ai-profile.entity";
import { IUserAIProfileRepository } from "../interfaces/user-ai-profile.repository";
import { ID } from "src/common/types/type";
import { BaseAIRepository } from "./base-ai.repository";

@Injectable()
export class UserAIProfileRepository extends BaseAIRepository implements IUserAIProfileRepository {

    constructor(
        @InjectRepository(UserAIProfile)
        private readonly userAIProfileRepository: Repository<UserAIProfile>,
    ) {
        super(UserAIProfileRepository.name);
    }

    async create(entity: UserAIProfile): Promise<UserAIProfile> {
        this.debugLog(`Creating AI profile for user ${entity.userId}`);
        return await this.userAIProfileRepository.save(entity);
    }

    async findOneById(id: ID): Promise<UserAIProfile | null> {
        this.debugLog(`Finding AI profile by id: ${id}`);
        return await this.userAIProfileRepository.findOne({
            where: { id },
            relations: ["user"],
        });
    }

    async findByUserId(userId: ID): Promise<UserAIProfile | null> {
        this.debugLog(`Finding AI profile by user id: ${userId}`);
        return await this.userAIProfileRepository.findOne({
            where: { userId },
            relations: ["user"],
        });
    }

    async update(entity: UserAIProfile): Promise<UserAIProfile> {
        this.debugLog(`Updating AI profile with id: ${entity.id}`);
        return await this.userAIProfileRepository.save(entity);
    }

    async delete(id: ID): Promise<UserAIProfile> {
        this.warnLog(`Deleting AI profile with id: ${id}`); // Delete operatsiyasi muhim
        const entity = await this.findOneById(id);
        if (!entity) {
            this.errorLog(`AI profile with id ${id} not found`);
            throw new Error(`AI profile with id ${id} not found`);
        }
        await this.userAIProfileRepository.remove(entity);
        return entity;
    }

    async findAll(): Promise<UserAIProfile[]> {
        this.debugLog("Finding all AI profiles");
        return await this.userAIProfileRepository.find({
            relations: ["user"],
        });
    }
}
