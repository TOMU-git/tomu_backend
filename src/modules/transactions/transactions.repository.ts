import { InjectRepository } from "@nestjs/typeorm";
import { ITransactionRepo } from "./interfaces/transaction-repo";
import { TransactionEntity } from "./entities/transaction.entity";
import { Repository } from "typeorm";

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

  async getOneById(id: string): Promise<TransactionEntity> {
    return await this.repository.findOneBy({ id });
  }

  async updateTransaction(
    entity: TransactionEntity,
  ): Promise<TransactionEntity> {
    return await this.repository.save(entity);
  }

  async getByFilter(
    userId: number,
    tariffId: number,
  ): Promise<TransactionEntity> {
    return await this.repository.findOne({ where: [{ userId }, { tariffId }] });
  }

  async getTransactionInPeriod(
    from: number,
    to: number,
  ): Promise<TransactionEntity[]> {
    return await this.repository
      .createQueryBuilder("transactions")
      .where("transactions.createTime BEYTWEEN :from AND :to", { from, to })
      .getMany();
  }
}
