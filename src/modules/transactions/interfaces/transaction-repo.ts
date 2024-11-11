import { ResData } from "src/lib/resData";
import { TransactionEntity } from "../entities/transaction.entity";

export interface ITransactionRepo {
    createTransaction(entity: TransactionEntity): Promise<TransactionEntity>;
    getOneById(id: string): Promise<TransactionEntity>;
    updateTransaction(id: string, entity: TransactionEntity): Promise<TransactionEntity>;
    getByFilter(userId: number, tariffId: number): Promise<TransactionEntity>; 
    getTransactionInPeriod(from: number, to: number): Promise<TransactionEntity[]>;
}