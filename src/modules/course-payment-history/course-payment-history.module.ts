import { Module } from '@nestjs/common';
import { CoursePaymentHistoryService } from './course-payment-history.service';
import { CoursePaymentHistoryController } from './course-payment-history.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoursePaymentHistoryEntity } from './entities/course-payment-history.entity';
import { CoursePaymentRepository } from './course-payment-history.repository';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([CoursePaymentHistoryEntity]), UserModule],
  controllers: [CoursePaymentHistoryController],
  providers: [
    { provide: "ICoursePaymentService", useClass: CoursePaymentHistoryService },
    {provide: "ICoursePaymentRepository", useClass:CoursePaymentRepository}
  ],
  exports: [
    { provide: "ICoursePaymentService", useClass: CoursePaymentHistoryService },
    { provide: "ICoursePaymentRepository", useClass: CoursePaymentRepository}
  ],
})
export class CoursePaymentHistoryModule {}
