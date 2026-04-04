import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, LessThan } from "typeorm";
import { SmsLog } from "./entities/sms-log.entity";
import { ISmsLogRepository } from "./interfaces/sms-log.repository";
import { SmsLogFilterDto } from "./dto/sms-log-filter.dto";

@Injectable()
export class SmsLogRepository implements ISmsLogRepository {
  constructor(
    @InjectRepository(SmsLog)
    private readonly repo: Repository<SmsLog>,
  ) {}

  async create(data: Partial<SmsLog>): Promise<SmsLog> {
    const log = this.repo.create(data);
    return this.repo.save(log);
  }

  async findAll(filter: SmsLogFilterDto): Promise<[SmsLog[], number]> {
    const { phone, status, type, from, to, page = 1, limit = 20 } = filter;

    const qb = this.repo.createQueryBuilder("log");

    if (phone) {
      qb.andWhere("log.phone LIKE :phone", { phone: `%${phone}%` });
    }
    if (status) {
      qb.andWhere("log.status = :status", { status });
    }
    if (type) {
      qb.andWhere("log.type = :type", { type });
    }
    if (from) {
      qb.andWhere("log.createdAt >= :from", { from: new Date(from) });
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere("log.createdAt <= :to", { to: toDate });
    }

    qb.orderBy("log.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .from(SmsLog)
      .where("created_at < :date", { date })
      .execute();

    return result.affected || 0;
  }
}
