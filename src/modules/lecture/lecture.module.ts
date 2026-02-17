import { Module, forwardRef } from '@nestjs/common';
import { NotificationModule } from '../notification/notification.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureService } from './lecture.service';
import { LectureController } from './lecture.controller';
import { LectureRepository } from './lecture.repository';
import { Lecture } from './entities/lecture.entity';
import { ScheduleCalculatorService } from './schedule-calculator.service';
import { LectureLifecycleService } from './services/lecture-lifecycle.service';
import { LectureReminderService } from './services/lecture-reminder.service';
import { LectureListener } from './listeners/lecture.listener';
import { GroupModule } from '../group/group.module';
import { GrammarModule } from '../grammar/grammar.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lecture]),
    forwardRef(() => GroupModule),
    GrammarModule,
    NotificationModule,
    UserModule,
  ],
  controllers: [LectureController],
  providers: [
    { provide: 'ILectureService', useClass: LectureService },
    { provide: 'ILectureRepository', useClass: LectureRepository },
    ScheduleCalculatorService,
    LectureLifecycleService,
    LectureReminderService,
    LectureListener,
  ],
  exports: [
    'ILectureService',
    'ILectureRepository',
    ScheduleCalculatorService,
  ],
})
export class LectureModule { }

