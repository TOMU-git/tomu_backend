import { LivechatPaymentHistoryEntity } from "../entities/livechat-payment-history.entity";

export interface ILiveChatPaymentRepository {
    getAll(): Promise<LivechatPaymentHistoryEntity[]>;
    getOne(id: number): Promise<LivechatPaymentHistoryEntity>;
    create(entity: LivechatPaymentHistoryEntity): Promise<LivechatPaymentHistoryEntity>;
    delete(id: number): Promise<LivechatPaymentHistoryEntity>;
}