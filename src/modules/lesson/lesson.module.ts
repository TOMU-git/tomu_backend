import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { LessonRepository } from './lesson.repository';
import { Lesson } from './entities/lesson.entity';
import { SharedModule } from '../shared/shared.module';
import { VimeoService } from './vimeo.service';
import { BlockModule } from '../block/block.module';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson]), SharedModule, BlockModule],
  controllers: [LessonController],
  providers: [
    VimeoService,
    { provide: "ILessonService", useClass: LessonService },
    { provide: "ILessonRepository", useClass: LessonRepository },
  ],
  exports: [
    { provide: "ILessonService", useClass: LessonService },
    { provide: "ILessonRepository", useClass: LessonRepository },
  ],
})
export class LessonModule {}
