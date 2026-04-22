import { Inject, Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SmsLog } from "./entities/sms-log.entity";
import { ISmsLogRepository } from "./interfaces/sms-log.repository";
import { ISmsLogService } from "./interfaces/sms-log.service";
import { SmsLogFilterDto } from "./dto/sms-log-filter.dto";
import { ResData } from "src/lib/resData";
import { HttpStatus } from "@nestjs/common";

@Injectable()
export class SmsLogService implements ISmsLogService {
  constructor(
    @Inject("ISmsLogRepository")
    private readonly smsLogRepository: ISmsLogRepository,
  ) {}

  async log(data: Partial<SmsLog>): Promise<void> {
    try {
      await this.smsLogRepository.create(data);
    } catch (error) {
      console.error("[SmsLog] Failed to write SMS log:", error.message);
    }
  }

  async findAll(filter: SmsLogFilterDto) {
    const [items, total] = await this.smsLogRepository.findAll(filter);
    const { page = 1, limit = 20 } = filter;

    return new ResData("SMS logs", HttpStatus.OK, { items, total, page, limit });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    const deleted = await this.smsLogRepository.deleteOlderThan(cutoffDate);
    console.log(`[SmsLog] Deleted ${deleted} logs older than 30 days`);
  }
}
