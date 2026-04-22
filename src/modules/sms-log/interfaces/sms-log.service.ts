import { SmsLog } from "../entities/sms-log.entity";
import { SmsLogFilterDto } from "../dto/sms-log-filter.dto";
import { ResData } from "src/lib/resData";

export interface ISmsLogService {
  log(data: Partial<SmsLog>): Promise<void>;
  findAll(filter: SmsLogFilterDto): Promise<ResData<{ items: SmsLog[]; total: number; page: number; limit: number }>>;
  cleanupOldLogs(): Promise<void>;
}
