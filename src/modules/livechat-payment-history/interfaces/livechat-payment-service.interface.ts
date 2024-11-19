import { ResData } from "src/lib/resData";
import { LivechatPaymentHistoryEntity } from "../entities/livechat-payment-history.entity";

export interface ILiveChatPaymentService {
    findAll(): Promise<ResData<LivechatPaymentHistoryEntity[]>>;
    findOneById(id: number): Promise<ResData<LivechatPaymentHistoryEntity>>;
}