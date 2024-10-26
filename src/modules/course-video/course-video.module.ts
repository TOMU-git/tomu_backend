import { Module } from '@nestjs/common';
import { CourseVideoService } from './course-video.service';
import { CourseVideoController } from './course-video.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseVideo } from './entities/course-video.entity';
import { SharedModule } from '../shared/shared.module';
import { VimeoService } from '../lesson/vimeo.service';
import { CourseVideoRepository } from './course-video.repository';

@Module({
  imports: [TypeOrmModule.forFeature([CourseVideo]), SharedModule],
  controllers: [CourseVideoController],
  providers: [
    VimeoService,
    { provide: 'ICourseVideoService', useClass: CourseVideoService },
    { provide: 'ICourseVideoRepository', useClass: CourseVideoRepository },
  ],
  exports: [
    { provide: 'ICourseVideoService', useClass: CourseVideoService },
    { provide: 'ICourseVideoRepository', useClass: CourseVideoRepository },
  ],
})
export class CourseVideoModule {}
