import { InjectRepository } from "@nestjs/typeorm";
import { ILiveChatRepository } from "./interfaces/repository-interface";
import { LiveChatEntity } from "./entities/live-chat.entity";
import { Repository } from "typeorm";
import { MeetingStatusEnum } from "src/common/enums/enum";

export class LiveChatRepository implements ILiveChatRepository {
    constructor(@InjectRepository(LiveChatEntity) private readonly repository: Repository<LiveChatEntity>) { }
    
    async createLiveChat(entity: LiveChatEntity): Promise<LiveChatEntity> {
        return this.repository.save(entity);
    }
    
    async findAllLiveChats(): Promise<Array<LiveChatEntity>> {
        return this.repository.find({where: {status: MeetingStatusEnum.PAID}});
    }
    
    async findLiveChatById(id: number): Promise<LiveChatEntity | null> {
        return this.repository.findOneBy({ id });
    }
    
    async findLiveChatByUserId(userId: number): Promise<Array<LiveChatEntity>> {
        return this.repository.find({ where: { userId } });
    }
    
    async findLiveChatByDay(day: Date): Promise<Array<LiveChatEntity>> {
        return this.repository.find({ where: { selectedDay: day } });
    }
    
    async updateLiveChat(id: number, entity: LiveChatEntity): Promise<any> {
        return this.repository.update(id, entity);
    }
    
    async deleteLiveChat(entity: LiveChatEntity): Promise<LiveChatEntity> {
        return this.repository.remove(entity);
    }
}