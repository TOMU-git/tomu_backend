import { Module } from "@nestjs/common";
import { UserProgressService } from "./user-progress.service";
import { UserProgressController } from "./user-progress.controller";
import { LessonModule } from "../lesson/lesson.module";
import { HomeworkModule } from "../homework/homework.module";
import { HomeworkProgressModule } from "../homework-progress/homework-progress.module";
import { LessonProgressModule } from "../lesson-progress/lesson-progress.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [
    SharedModule,
    HomeworkModule,
    LessonModule,
    HomeworkProgressModule,
    LessonProgressModule,
  ],
  controllers: [UserProgressController],
  providers: [UserProgressService],
})
export class UserProgressModule {}
