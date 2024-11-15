import { LivechatPriceEntity } from "../entities/livechat-price.entity";

export interface ILiveChatPriceRepository {
    getOneById(id: number): Promise<LivechatPriceEntity>;
    update(entity: LivechatPriceEntity): Promise<LivechatPriceEntity>;
}