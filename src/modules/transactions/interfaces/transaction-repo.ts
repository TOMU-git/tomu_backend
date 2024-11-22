import { ResData } from "src/lib/resData";
import { TransactionEntity } from "../entities/transaction.entity";

export interface ITransactionRepo {
    findAll(year: number): Promise<TransactionEntity[]>;
    getAllByTariffId(start: number, end: number): Promise<TransactionEntity[]>;
    getAllByLiveChatId(start: number, end: number): Promise<TransactionEntity[]>;
    createTransaction(entity: TransactionEntity): Promise<TransactionEntity>;
    getOneById(id: string): Promise<TransactionEntity>;
    getAllByCourseId(from: number, to: number, courseId: number): Promise<IResponse>;
    updateTransaction(id: string, entity: TransactionEntity): Promise<TransactionEntity>;
    getByFilter(userId: number, tariffId: number): Promise<TransactionEntity>; 
    getTransactionInPeriod(from: number, to: number): Promise<TransactionEntity[]>;
}

export interface IResponse {
    count: number;
    data: TransactionEntity[];
}