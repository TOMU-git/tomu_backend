import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { PaymeParams } from "src/common/types/type";
import { IUserService } from "../user/interfaces/user.service";
import { ITariffService } from "../tariff/interface/tariff.service";
import { ITransactionRepo } from "./interfaces/transaction-repo";
import { ITransactionService } from "./interfaces/transaction-service";
import { IUserRepository } from "../user/interfaces/user.repository";
import { ITariffRepository } from "../tariff/interface/tariff.repository";
import { TransactionErrorException } from "./exception/transactionException";
import { PaymeError } from "src/common/error/message";
import {
  ICancelTransactionDto,
  ICheckTransactionDto,
  ICreateTransactionDto,
  IGetStatementTransactionDto,
  IPerformTransactionDto,
} from "./dto/response.dto";
import { TransactionStateEnum } from "src/common/enums/transaction";
import { TransactionEntity } from "./entities/transaction.entity";

@Injectable()
export class TransactionsService implements ITransactionService {
  constructor(
    @Inject("ITransactionRepository")
    private readonly transactionRepository: ITransactionRepo,
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
    @Inject("ITariffRepository")
    private readonly tariffRepository: ITariffRepository,
  ) { }
  
  //// *** Checking 

  async checkPerformTransaction(params: PaymeParams, id: number) {
    const {
      account: { user_id: userId, tariff_id: tariffId },
    } = params;

    const foundUser = await this.userRepository.findOneById(Number(userId));
    if (!foundUser) {
      throw new TransactionErrorException(PaymeError.UserNotFound, id, HttpStatus.NOT_FOUND);
    }
    const foundTariff = await this.tariffRepository.findOneById(
      Number(tariffId),
    );
    if (!foundTariff) {
      throw new TransactionErrorException(PaymeError.TariffNotFound, id);
    }

    let { amount } = params;

    amount = Math.floor(amount / 100);

    if (amount !== Math.floor(foundTariff.price / 100)) {
      throw new TransactionErrorException(PaymeError.InvalidAmount, id);
    }
  }
  async checkTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICheckTransactionDto> {
    const foundTransaction = await this.transactionRepository.getOneById(
      params.id,
    );

    if (!foundTransaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }

    return {
      create_time: Number(foundTransaction.createTime),
      perform_time: Number(foundTransaction.performTime),
      cancel_time: Number(foundTransaction.cancelTime),
      transaction: foundTransaction.id,
      state: foundTransaction.state,
      reason: Number(foundTransaction.reason),
    };
  }
  async createTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICreateTransactionDto> {
    const { account: {user_id: userId, tariff_id: tariffId}, time } = params;
    let { amount } = params;

    amount = Math.floor(amount / 100);

    await this.checkPerformTransaction(params, id);

    let transaction = await this.transactionRepository.getOneById(params.id);
    if (transaction) {
      if (transaction.state !== TransactionStateEnum.PENDING) {
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }

      const currentTime = Date.now();

      const expirationTime =
        (currentTime - Number(transaction.createTime)) / (1000 * 60 * 60) > 12; /// Agar transaction yaratilganiga 12 soatdan ko'p bo'lgan bo'lsa transactionni cancel qilib yuboramiz
      if (!expirationTime) {
        transaction.state = TransactionStateEnum.PENDING_CANCELED;
        transaction.reason = 4;
        await this.transactionRepository.updateTransaction(transaction);
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }

      return {
        create_time: Number(transaction.createTime),
        transaction: transaction.id,
        state: TransactionStateEnum.PENDING,
      };
    }
    transaction = await this.transactionRepository.getByFilter(Number(userId), Number(tariffId));
    if (transaction) { 
      if (transaction.state === TransactionStateEnum.PAID) {
        throw new TransactionErrorException(PaymeError.AlreadyDone, id); 
      }
      if (transaction.state === TransactionStateEnum.PENDING) {
        throw new TransactionErrorException(PaymeError.Pending, id);
      }
    }

      const newTransaction = new TransactionEntity();
      newTransaction.id = params.id;
      newTransaction.userId = Number(userId);
      newTransaction.tariffId = Number(tariffId);
      newTransaction.state = TransactionStateEnum.PENDING;
      newTransaction.createTime = time;
      newTransaction.amount = amount;
      const createdTransaction = await this.transactionRepository.createTransaction(newTransaction)

    return {
      create_time: Number(createdTransaction.createTime),
      transaction: params.id,
      state: TransactionStateEnum.PENDING,
    }
  }
  async performTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<IPerformTransactionDto> {
    const currentTime = Date.now();
    const transaction = await this.transactionRepository.getOneById(params.id);
    if (!transaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }
    if (transaction.state !== TransactionStateEnum.PENDING) {
      if (transaction.state !== TransactionStateEnum.PAID) {
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }
      return {
        perform_time: Number(transaction.performTime),
        transaction: transaction.id,
        state: TransactionStateEnum.PAID,
      };
    }

    const expirationTime =
      (currentTime - Number(transaction.createTime)) / (1000 * 60 * 60) > 12; /// Agar transaction yaratilganiga 12 soatdan ko'p bo'lgan bo'lsa transactionni cancel qilib yuboramiz
    if (!expirationTime) {
      transaction.state = TransactionStateEnum.PENDING_CANCELED;
      transaction.reason = 4;
      transaction.cancelTime = currentTime;
      await this.transactionRepository.updateTransaction(transaction);
      throw new TransactionErrorException(PaymeError.CantDoOperation, id);
    }

    transaction.state = TransactionStateEnum.PAID;
    transaction.performTime = currentTime;
    await this.transactionRepository.updateTransaction(transaction);

    return {
      perform_time: currentTime,
      transaction: transaction.id,
      state: TransactionStateEnum.PAID,
    };
  }
  async cancelTransaction(params: PaymeParams, id: number): Promise<ICancelTransactionDto> {
    const transaction = await this.transactionRepository.getOneById(params.id);
    if (!transaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }
    const currentTime = Date.now();
    if (transaction.state > 0) {
      transaction.state = -Math.abs(transaction.state);
      transaction.reason = params.reason;
      transaction.cancelTime = currentTime;
      await this.transactionRepository.updateTransaction(transaction);
		}
		return {
			cancel_time: Number(transaction.cancelTime) || currentTime,
			transaction: transaction.id,
			state: -Math.abs(transaction.state),
		};
  }
  async getStatement(params: PaymeParams, id: number): Promise<Array<IGetStatementTransactionDto>> {
    const transactions: Array<TransactionEntity> = await this.transactionRepository.getTransactionInPeriod(
      Number(params.from),
      Number(params.to),
    );
    const mappedData: Array<IGetStatementTransactionDto> = transactions.map((tr: TransactionEntity) => ({
      id: tr.id,
      time: Number(tr.createTime),
      amount: Number(tr.amount) * 100,
      account: { tariff_id: tr.tariffId, user_id: tr.userId },
      create_time: Number(tr.createTime),
      perform_time: Number(tr.createTime),
      cancel_time: Number(tr.createTime),
      transaction: Number(tr.id),
      state: Number(tr.createTime),
      reason: Number(tr.createTime)
        ? Number(tr.createTime)
        : null,
      receivers: [],
    }));
    
    return mappedData;
  }
}
