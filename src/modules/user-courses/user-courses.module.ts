import { Module } from '@nestjs/common';
import { UserCoursesController } from './user-courses.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserCourse } from './entities/user-course.entity';
import { UserCourseRepository } from './user-course.repository';
import { UserCourseService } from './user-courses.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse])],
  controllers: [UserCoursesController],
    providers: [
      { provide: 'IUserCourseService', useClass: UserCourseService },
      { provide: 'IUserCourseRepository', useClass: UserCourseRepository },
    ],
})
export class UserCoursesModule {}
