import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports:[TransactionsModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: "IAnalyticsService", useClass: AnalyticsService },
  ],
  exports: [
    { provide: "IAnalyticsService", useClass: AnalyticsService },
  ],
 
})
export class AnalyticsModule {}
