import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { UserModule } from '../user/user.module';

@Module({
  imports:[TransactionsModule, UserModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: "IAnalyticsService", useClass: AnalyticsService },
  ],
  exports: [
    { provide: "IAnalyticsService", useClass: AnalyticsService },
  ],
 
})
export class AnalyticsModule {}
