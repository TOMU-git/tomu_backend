import { LivechatPaymentHistoryEntity } from "../entities/livechat-payment-history.entity";

export interface ILiveChatPaymentRepository {
    getAll(limit: number, page: number): Promise<ILiveChatCount>;
    getOne(id: number): Promise<LivechatPaymentHistoryEntity>;
    create(entity: LivechatPaymentHistoryEntity): Promise<LivechatPaymentHistoryEntity>;
    delete(id: number): Promise<LivechatPaymentHistoryEntity>;
}

export interface ILiveChatCount {
    data: Array<LivechatPaymentHistoryEntity>;
    count: number;
}