import { InjectRepository } from "@nestjs/typeorm";
import { IUserLiveChatRepository } from "./interfaces/user-livechat.repository.interface";
import { UserLivechatEntity } from "./entities/user-livechat.entity";
import { Repository } from "typeorm";

export class UserLiveChatRepository implements IUserLiveChatRepository {
  constructor(
    @InjectRepository(UserLivechatEntity)
    private readonly repository: Repository<UserLivechatEntity>,
  ) {}

  async create(entity: UserLivechatEntity): Promise<UserLivechatEntity> {
    return await this.repository.save(entity);
  }

  async getAll(): Promise<UserLivechatEntity[]> {
    return await this.repository.find({ where: { isAccepted: true } });
  }

  async getByLiveChatId(id: number): Promise<UserLivechatEntity>{
    return await this.repository.findOneBy({ liveChatId: id });
  }

  async getByUserId(userId: number): Promise<UserLivechatEntity[]> {
    return await this.repository.find({ where: { userId } });
  }

  async getByTeacherId(teacherId: number, courseId: number): Promise<UserLivechatEntity[]> {
    return await this.repository.find({ where: { teacherId, courseId } });
  }
}
