import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LectureService } from './lecture.service';
import { LectureController } from './lecture.controller';
import { LectureRepository } from './lecture.repository';
import { Lecture } from './entities/lecture.entity';
import { ScheduleCalculatorService } from './schedule-calculator.service';
import { GroupModule } from '../group/group.module';
import { GrammarModule } from '../grammar/grammar.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lecture]),
    forwardRef(() => GroupModule),
    GrammarModule,
  ],
  controllers: [LectureController],
  providers: [
    { provide: 'ILectureService', useClass: LectureService },
    { provide: 'ILectureRepository', useClass: LectureRepository },
    ScheduleCalculatorService,
  ],
  exports: [
    'ILectureService',
    'ILectureRepository',
    ScheduleCalculatorService,
  ],
})
export class LectureModule { }
