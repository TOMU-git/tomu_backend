import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SmsLog } from "./entities/sms-log.entity";
import { SmsLogController } from "./sms-log.controller";
import { SmsLogService } from "./sms-log.service";
import { SmsLogRepository } from "./sms-log.repository";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [TypeOrmModule.forFeature([SmsLog]), SharedModule],
  controllers: [SmsLogController],
  providers: [
    { provide: "ISmsLogService", useClass: SmsLogService },
    { provide: "ISmsLogRepository", useClass: SmsLogRepository },
  ],
  exports: [{ provide: "ISmsLogService", useClass: SmsLogService }],
})
export class SmsLogModule {}
