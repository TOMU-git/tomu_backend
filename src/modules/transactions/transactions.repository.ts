import { InjectRepository } from "@nestjs/typeorm";
import { IResponse, ITransactionRepo } from "./interfaces/transaction-repo";
import { TransactionEntity } from "./entities/transaction.entity";
import { Repository, Not, IsNull, Between } from "typeorm";
import { TransactionStateEnum } from "src/common/enums/transaction";

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

  async findAll(year: number): Promise<TransactionEntity[]> {
    return await this.repository.find({where: {createTime: Between(new Date(`${year}-01-01`).getTime(), new Date(`${year}-12-31`).getTime()), state: TransactionStateEnum.PAID}});
  }

  async getOneById(transactionId: string): Promise<TransactionEntity> {
    return await this.repository.findOneBy({ id: transactionId });
  }

  async updateTransaction(id: string, entity: TransactionEntity): Promise<any> {
    return await this.repository.update(id, entity);
  }

  async getByFilter(
    userId: number,
    orderId: number,
  ): Promise<TransactionEntity> {
    return await this.repository.findOne({ where: { userId, orderId } });
  }

  async getAllByCourseId(
    from: number,
    to: number,
    courseId: number,
  ): Promise<IResponse> {
    const count = await this.repository
      .createQueryBuilder("transactions")
      .where(
        "transactions.courseId = :courseId AND transactions.state = :state",
        { courseId, state: TransactionStateEnum.PAID },
      )
      .andWhere("transactions.createTime BETWEEN :from AND :to", {
        from, to
      })
      .getCount();

    const data = await this.repository
      .createQueryBuilder("transactions")
      .where(
        "transactions.courseId = :courseId AND transactions.state = :state",
        { courseId, state: TransactionStateEnum.PAID},
      )
      .andWhere("transactions.createTime BETWEEN :from AND :to", {
        from, to
      })
      .select(["transactions.amount", 'amount'])
      .getRawMany();

    return { count, data };
  }

  async getAllByTariffId(start: number, end: number): Promise<any> {
    return await this.repository
      .createQueryBuilder("transactions")
      .where(
        "transactions.tariffId IS NOT NULL AND transactions.state = :state",
        { state: TransactionStateEnum.PAID },
      )
      .andWhere("transactions.createTime BETWEEN :start AND :end", {
        start,
        end,
      })
      .select("transactions.amount", "amount")
      .getRawMany();
  }
  async getAllByLiveChatId(
    start: number,
    end: number,
  ): Promise<TransactionEntity[]> {
    return await this.repository
      .createQueryBuilder("transactions")
      .where(
        "transactions.liveChatId IS NOT NULL AND transactions.state = :state",
        { state: TransactionStateEnum.PAID },
      )
      .andWhere("transactions.createTime BETWEEN :start AND :end", {
        start,
        end,
      })
      .select("transactions.amount", "amount")
      .getRawMany();
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
