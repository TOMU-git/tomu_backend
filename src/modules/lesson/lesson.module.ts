import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../course/entities/course.entity';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { LessonRepository } from './lesson.repository';
import { Lesson } from './entities/lesson.entity';
import { SharedModule } from '../shared/shared.module';
import { VimeoService } from './vimeo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson]), SharedModule],
  controllers: [LessonController],
  providers: [
    VimeoService,
    { provide: 'ILessonService', useClass: LessonService },
    { provide: 'ILessonRepository', useClass: LessonRepository },
  ],
  exports: [
    { provide: 'ILessonService', useClass: LessonService },
    { provide: 'ILessonRepository', useClass: LessonRepository },
  ],
})
export class LessonModule {}
