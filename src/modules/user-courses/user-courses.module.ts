import { Module, forwardRef } from "@nestjs/common";
import { UserCoursesController } from "./user-courses.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserCourse } from "./entities/user-course.entity";
import { UserCourseRepository } from "./user-course.repository";
import { UserCourseService } from "./user-courses.service";
import { SharedModule } from "../shared/shared.module";
import { CourseModule } from "../course/course.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserCourse]), 
    SharedModule, 
    forwardRef(() => CourseModule),
  ],
  controllers: [UserCoursesController],
  providers: [
    { provide: "IUserCourseService", useClass: UserCourseService },
    { provide: "IUserCourseRepository", useClass: UserCourseRepository },
  ],
  exports: [
    { provide: "IUserCourseService", useClass: UserCourseService },
    { provide: "IUserCourseRepository", useClass: UserCourseRepository },
  ],
})
export class UserCoursesModule {}
