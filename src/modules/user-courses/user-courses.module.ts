import { Module } from "@nestjs/common";
import { UserCoursesController } from "./user-courses.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserCourse } from "./entities/user-course.entity";
import { UserCourseRepository } from "./user-course.repository";
import { UserCourseService } from "./user-courses.service";
import { SharedModule } from "../shared/shared.module";
import { CourseModule } from "../course/course.module";
<<<<<<< HEAD
import { Course } from "../course/entities/course.entity";
import { CourseService } from "../course/course.service";
import { CourseRepository } from "../course/course.repository";
import { FileModule } from "../file/file.module";
import { File } from "../file/entities/file.entity";
import { FileService } from "../file/file.service";
import { FileRepository } from "../file/file.repository";
import { User } from "../user/entities/user.entity";
import { UserModule } from "../user/user.module";

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse]), SharedModule, CourseModule, UserModule],
=======

@Module({
  imports: [TypeOrmModule.forFeature([UserCourse]), SharedModule, CourseModule],
>>>>>>> 4a279b633edda6bcdf6520321f5768221e891505
  controllers: [UserCoursesController],
  providers: [
    { provide: "IUserCourseService", useClass: UserCourseService },
    { provide: "IUserCourseRepository", useClass: UserCourseRepository },
  ],
})
export class UserCoursesModule {}
