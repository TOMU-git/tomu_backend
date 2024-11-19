import { ResData } from "src/lib/resData";
import { LivechatPriceEntity } from "../entities/livechat-price.entity";
import { UpdateLivechatPriceDto } from "../dto/update-livechat-price.dto";

export interface ILiveChatPriceService {
    findAll(): Promise<ResData<LivechatPriceEntity[]>>;
    findOneById(id: number): Promise<ResData<LivechatPriceEntity>>;
    update(id: number, dto: UpdateLivechatPriceDto): Promise<ResData<LivechatPriceEntity>>;
}