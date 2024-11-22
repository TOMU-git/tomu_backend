import { ResData } from "src/lib/resData";
import { LivechatPaymentHistoryEntity } from "../entities/livechat-payment-history.entity";

export interface ILiveChatPaymentService {
    findAll(limit: number, page: number): Promise<ResData<ILiveChatCountResponse>>;
    findOneById(id: number): Promise<ResData<LivechatPaymentHistoryEntity>>;
}

export interface ILiveChatCountResponse {
    count: number,
    total_page: number,
    data: LivechatPaymentHistoryEntity[]
}