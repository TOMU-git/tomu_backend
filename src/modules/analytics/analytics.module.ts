import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';

@Module({
  imports:[TransactionsModule, UserModule, CourseModule],
  controllers: [AnalyticsController],
  providers: [
    { provide: "IAnalyticsService", useClass: AnalyticsService },
  ],
  exports: [
    { provide: "IAnalyticsService", useClass: AnalyticsService },
  ],
 
})
export class AnalyticsModule {}
