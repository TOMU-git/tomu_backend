import { InjectRepository } from "@nestjs/typeorm";
import { ILiveChatPriceRepository } from "./interfaces/livechat-price-repository.interface";
import { LivechatPriceEntity } from "./entities/livechat-price.entity";
import { Repository } from "typeorm";

export class LiveChatPriceRepository implements ILiveChatPriceRepository {
  constructor(
    @InjectRepository(LivechatPriceEntity)
    private readonly repository: Repository<LivechatPriceEntity>,
  ) {}

  async getOneById(id: number): Promise<LivechatPriceEntity> {
    return this.repository.findOneBy({ id });
  }

  async update(entity: LivechatPriceEntity): Promise<LivechatPriceEntity> {
    return this.repository.save(entity);
  }
}
