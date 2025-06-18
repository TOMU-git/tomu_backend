import { Module, forwardRef } from "@nestjs/common";
import { HomeworkProgressService } from "./homework-progress.service";
import { HomeworkProgressController } from "./homework-progress.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { SharedModule } from "../shared/shared.module";
import { HomeworkModule } from "../homework/homework.module";
import { UserModule } from "../user/user.module";
import { BlockModule } from "../block/block.module";
import { LessonProgressModule } from "../lesson-progress/lesson-progress.module";
import { UserHomeworkProgressModule } from "../user-homework-progress/user-homework-progress.module";
import { ScheduleModule } from "@nestjs/schedule";
import { HomeworkQueue } from "./entities/homework-queue.entity";
import { HomeworkProgressRepository } from "./repositories/homework-progress.repository";
import { HomeworkQueueRepository } from "./repositories/homework-queue.repository";
import { LessonModule } from "../lesson/lesson.module";
import { UserCoursesModule } from "../user-courses/user-courses.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([HomeworkProgress, HomeworkQueue]),
    SharedModule,
    HomeworkModule,
    UserModule,
    BlockModule,
    UserHomeworkProgressModule,
    LessonModule,
    UserCoursesModule,
    forwardRef(() => LessonProgressModule),
    ScheduleModule.forRoot(),
  ],
  controllers: [HomeworkProgressController],
  providers: [
    { provide: "IHomeworkProgressService", useClass: HomeworkProgressService },
    {
      provide: "IHomeworkProgressRepository",
      useClass: HomeworkProgressRepository,
    },
    HomeworkQueueRepository,
  ],
  exports: [
    { provide: "IHomeworkProgressService", useClass: HomeworkProgressService },
    {
      provide: "IHomeworkProgressRepository",
      useClass: HomeworkProgressRepository,
    },
    HomeworkQueueRepository,
  ],
})
export class HomeworkProgressModule { }
