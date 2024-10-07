import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Feedback } from './entities/feedback.entity';
import { FeedbackRepository } from './feedback.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Feedback])],
  controllers: [FeedbackController],
  providers: [
    { provide: 'IFeedbackService', useClass: FeedbackService },
    { provide: 'IFeedbackRepository', useClass: FeedbackRepository },
  ],
})
export class FeedbackModule {}
