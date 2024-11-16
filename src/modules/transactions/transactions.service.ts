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
import { IOrderService } from "../orders/interfaces/service-interface";
import { OrderStatus } from "src/common/enums/order-status";
import { IOrderRepository } from "../orders/interfaces/repository-interface";
import { ILiveChatRepository } from "../live-chat/interfaces/repository-interface";
import { MeetingStatusEnum } from "src/common/enums/enum";
import { UserTariff } from "../user-tariff/entities/user-tariff.entity";
import { IUserTariffRepository } from "../user-tariff/interfaces/user-tariff.repository";

@Injectable()
export class TransactionsService implements ITransactionService {
  constructor(
    @Inject("ITransactionRepository")
    private readonly transactionRepository: ITransactionRepo,
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
    @Inject("IOrderService") private readonly orderService: IOrderService,
    @Inject("IOrderRepository")
    private readonly orderRepository: IOrderRepository,
    @Inject("ILiveChatRepository")
    private readonly liveChatRepository: ILiveChatRepository,
    @Inject("ITariffRepository")
    private readonly tariffRepository: ITariffRepository,
    @Inject("IUserTariffRepository")
    private readonly userTariffRepository: IUserTariffRepository,
  ) {}

  //// *** Checking

  async checkPerformTransaction(params: PaymeParams, id: number) {
    const {
      account: { user_id: userId, order_id: orderId },
    } = params;

    const foundUser = await this.userRepository.findOneById(Number(userId));
    if (!foundUser) {
      throw new TransactionErrorException(PaymeError.UserNotFound, id);
    }
    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(orderId),
    );
    if (!foundOrder) {
      throw new TransactionErrorException(PaymeError.OrderNotFound, id);
    }

    let { amount } = params;

    amount = Math.floor(amount / 100);

    if (amount !== Number(foundOrder.totalPrice)) {
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
      reason: foundTransaction.reason,
    };
  }
  async createTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICreateTransactionDto> {
    const {
      account: { user_id: userId, order_id: orderId },
      time,
    } = params;
    let { amount } = params;

    amount = Math.floor(amount / 100);

    await this.checkPerformTransaction(params, id);

    const transaction = await this.transactionRepository.getOneById(params.id);

    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(orderId),
    );

    if (transaction) {
      if (transaction.state !== TransactionStateEnum.PENDING) {
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }

      const currentTime = Date.now();

      const expirationTime =
        (currentTime - Number(transaction.createTime)) / 60000 < 12; // 12m
      if (!expirationTime) {
        transaction.state = TransactionStateEnum.PENDING_CANCELED;
        await this.transactionRepository.updateTransaction(
          transaction.id,
          transaction,
        );

        foundOrder.status = OrderStatus.TIMEOUT;
        await this.orderRepository.update(foundOrder);
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }

      return {
        create_time: Number(transaction.createTime),
        transaction: transaction.id,
        state: TransactionStateEnum.PENDING,
      };
    }
    const transactionPaidOrPending =
      await this.transactionRepository.getByFilter(
        Number(userId),
        Number(orderId),
      );

    if (transactionPaidOrPending) {
      if (transactionPaidOrPending.state === TransactionStateEnum.PAID) {
        throw new TransactionErrorException(PaymeError.AlreadyDone, id);
      }
      if (transactionPaidOrPending.state === TransactionStateEnum.PENDING) {
        throw new TransactionErrorException(PaymeError.Pending, id);
      }
    }

    const newTransaction = new TransactionEntity();
    newTransaction.id = params.id;
    newTransaction.userId = Number(userId);
    newTransaction.orderId = Number(orderId);
    newTransaction.state = TransactionStateEnum.PENDING;
    newTransaction.createTime = time;
    newTransaction.amount = amount;
    (newTransaction.reason = null), (newTransaction.cancelTime = 0);
    newTransaction.performTime = 0;
    const createdTransaction =
      await this.transactionRepository.createTransaction(newTransaction);

    foundOrder.status = OrderStatus.PENDING;
    await this.orderRepository.update(foundOrder);

    return {
      create_time: Number(createdTransaction.createTime),
      transaction: params.id,
      state: TransactionStateEnum.PENDING,
    };
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
    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(transaction.orderId),
    );

    const expirationTime =
      (currentTime - Number(transaction.createTime)) / 60000 < 12; // 12m
    if (!expirationTime) {
      transaction.state = TransactionStateEnum.PENDING_CANCELED;
      transaction.reason = 4;
      transaction.cancelTime = currentTime;
      await this.transactionRepository.updateTransaction(
        transaction.id,
        transaction,
      );

      foundOrder.status = OrderStatus.TIMEOUT;
      await this.orderRepository.update(foundOrder);
      throw new TransactionErrorException(PaymeError.CantDoOperation, id);
    }

    transaction.state = TransactionStateEnum.PAID;
    transaction.performTime = currentTime;
    await this.transactionRepository.updateTransaction(
      transaction.id,
      transaction,
    );

    if (foundOrder.liveChatId) {
      const foundLiveChat = await this.liveChatRepository.findLiveChatById(
        Number(foundOrder.liveChatId),
      );
      (foundLiveChat.status = MeetingStatusEnum.PAID),
        await this.liveChatRepository.updateLiveChat(foundLiveChat.id, foundLiveChat);
    }

    if (foundOrder.tariffId) {
      const foundTariff = await this.tariffRepository.findOneById(
        Number(foundOrder.tariffId),
      );
      const newUserTariff = new UserTariff();
      newUserTariff.isActive = true;
      newUserTariff.startedAt = new Date();
      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setDate(expiryDate.getDate() + foundTariff.duration);
      newUserTariff.endedAt = expiryDate;
      newUserTariff.userId = foundOrder.userId;
      newUserTariff.tariffId = foundOrder.tariffId;
      await this.userTariffRepository.insert(newUserTariff);
    }

    foundOrder.status = OrderStatus.PAID;
    await this.orderRepository.update(foundOrder);

    return {
      perform_time: currentTime,
      transaction: transaction.id,
      state: TransactionStateEnum.PAID,
    }
  }
  async cancelTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICancelTransactionDto> {
    const transaction = await this.transactionRepository.getOneById(params.id);
    if (!transaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }
    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(transaction.orderId),
    );
    const currentTime = Date.now();
    if (transaction.state > 0) {
      transaction.state = -Math.abs(transaction.state);
      transaction.reason = params.reason;
      transaction.cancelTime = currentTime;
      await this.transactionRepository.updateTransaction(
        transaction.id,
        transaction,
      );
      foundOrder.status = OrderStatus.CANCELED;
      await this.orderRepository.update(foundOrder);
    }    
    if (foundOrder.liveChatId) {
      const foundLiveChat = await this.liveChatRepository.findLiveChatById(
        Number(foundOrder.liveChatId),
      );
      foundLiveChat.status = MeetingStatusEnum.UNPAID;
      await this.liveChatRepository.updateLiveChat(foundLiveChat.id, foundLiveChat);
    }

    if (foundOrder.tariffId) {
      const foundUserTariff = await this.userTariffRepository.findOneByTariffId(foundOrder.tariffId);
      await this.userTariffRepository.delete(foundUserTariff);
    }
    foundOrder.status = OrderStatus.CANCELED;
    await this.orderRepository.update(foundOrder);
    return {
      cancel_time: Number(transaction.cancelTime) || currentTime,
      transaction: transaction.id,
      state: -Math.abs(transaction.state),
    };
  }
  async getStatement(
    params: PaymeParams,
    id: number,
  ): Promise<Array<IGetStatementTransactionDto>> {
    const transactions: Array<TransactionEntity> =
      await this.transactionRepository.getTransactionInPeriod(
        Number(params.from),
        Number(params.to),
      );
    const mappedData: Array<IGetStatementTransactionDto> = transactions.map(
      (tr: TransactionEntity) => ({
        id: tr.id,
        time: Number(tr.createTime),
        amount: Number(tr.amount) * 100,
        account: { order_id: tr.orderId, user_id: tr.userId },
        create_time: Number(tr.createTime),
        perform_time: Number(tr.createTime),
        cancel_time: Number(tr.createTime),
        transaction: Number(id),
        state: Number(tr.createTime),
        reason: Number(tr.createTime) ? Number(tr.createTime) : null,
        receivers: [],
      }),
    );
    return mappedData;
  }
}
