import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../course/entities/course.entity';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { LessonRepository } from './lesson.repository';
import { Lesson } from './entities/lesson.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  controllers: [LessonController],
  providers: [
    { provide: 'ILessonService', useClass: LessonService },
    { provide: 'ILessonRepository', useClass: LessonRepository },
  ],
  exports: [
    { provide: 'ILessonService', useClass: LessonService },
    { provide: 'ILessonRepository', useClass: LessonRepository },
  ],
})
export class LessonModule {}
