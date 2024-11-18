import { InjectRepository } from "@nestjs/typeorm";
import { ITransactionRepo } from "./interfaces/transaction-repo";
import { TransactionEntity } from "./entities/transaction.entity";
import { Repository,  Not, IsNull} from "typeorm";

export class TransactionRepository implements ITransactionRepo {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repository: Repository<TransactionEntity>,
  ) {}

  async createTransaction(
    entity: TransactionEntity,
  ): Promise<TransactionEntity> {
    return await this.repository.save(entity);
  }

  async getOneById(transactionId: string): Promise<TransactionEntity> {
    return await this.repository.findOneBy({ id: transactionId });
  }

  async updateTransaction(
    id: string, entity: TransactionEntity,
  ): Promise<any> {
    return await this.repository.update(id, entity);
  }

  async getByFilter(
    userId: number,
    orderId: number,
  ): Promise<TransactionEntity> {
    return await this.repository.findOne({ where: [{ userId }, { orderId }] });
  }

  async getAllByTariffId(): Promise<any> {
    return await this.repository.find({ where: { tariffId: Not(IsNull()) }, select: ['amount'] });
  }
  async getAllByLiveChatId(): Promise<TransactionEntity[]> {
    return await this.repository.find({ where: { liveChatId: Not(IsNull()) }, select: { amount: true } });
  }

  async getTransactionInPeriod(
    from: number,
    to: number,
  ): Promise<TransactionEntity[]> {
    return await this.repository
      .createQueryBuilder("transactions")
      .where("transactions.createTime BETWEEN :from AND :to", { from, to })
      .getMany();
  }
}
