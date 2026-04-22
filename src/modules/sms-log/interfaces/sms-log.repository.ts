import { SmsLog } from "../entities/sms-log.entity";
import { SmsLogFilterDto } from "../dto/sms-log-filter.dto";

export interface ISmsLogRepository {
  create(data: Partial<SmsLog>): Promise<SmsLog>;
  findAll(filter: SmsLogFilterDto): Promise<[SmsLog[], number]>;
  deleteOlderThan(date: Date): Promise<number>;
}
