import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './entities/course.entity';
import { CourseRepository } from './course.repository';
import { CourseController } from './course.controller';
import { CourseService } from './course.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course])],
  controllers: [CourseController],
  providers: [
    { provide: 'ICourseService', useClass: CourseService },
    { provide: 'ICourseRepository', useClass: CourseRepository },
  ],
  exports: [
    { provide: 'ICourseService', useClass: CourseService },
    { provide: 'ICourseRepository', useClass: CourseRepository },
  ],
})
export class CourseModule {}
