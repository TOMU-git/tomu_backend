import { InjectRepository } from "@nestjs/typeorm";
import { ILiveChatPaymentRepository } from "./interfaces/livechat-payment-repository.interface";
import { LivechatPaymentHistoryEntity } from "./entities/livechat-payment-history.entity";
import { Repository } from "typeorm";

export class LiveChatPaymentRepository implements ILiveChatPaymentRepository {
  constructor(
    @InjectRepository(LivechatPaymentHistoryEntity)
    private readonly repository: Repository<LivechatPaymentHistoryEntity>,
  ) {}

  async getAll(): Promise<LivechatPaymentHistoryEntity[]> {
    return this.repository.find();
  }

  async getOne(id: number): Promise<LivechatPaymentHistoryEntity> {
    return await this.repository.findOneBy({ id });
  }

  async create(
    entity: LivechatPaymentHistoryEntity,
  ): Promise<LivechatPaymentHistoryEntity> {
    return this.repository.save(entity);
  }

  async delete(id: number): Promise<LivechatPaymentHistoryEntity> {
    const livechatPayment = await this.repository.findOneBy({ id });
    await this.repository.delete(id);
    return livechatPayment;
  }
}
