import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Course } from "./entities/course.entity";
import { CourseRepository } from "./course.repository";
import { CourseController } from "./course.controller";
import { CourseService } from "./course.service";
import { SharedModule } from "../shared/shared.module";
import { FileModule } from "../file/file.module";
import { VimeoService } from "../lesson/vimeo.service";
import { UserCoursesModule } from "../user-courses/user-courses.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Course]), 
    SharedModule, 
    FileModule,
    forwardRef(() => UserCoursesModule),
  ],
  controllers: [CourseController],
  providers: [
  VimeoService,
    { provide: "ICourseService", useClass: CourseService },
    { provide: "ICourseRepository", useClass: CourseRepository },

  ],
  exports: [
    { provide: "ICourseService", useClass: CourseService },
    { provide: "ICourseRepository", useClass: CourseRepository },
  ],
})
export class CourseModule {}
