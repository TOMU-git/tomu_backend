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
import { HomeworkWatchRecord } from "./entities/homework-watch-record.entity";
import { HomeworkQueue } from "./entities/homework-queue.entity";
import { HomeworkProgressRepository } from "./repositories/homework-progress.repository";
import { HomeworkWatchRecordRepository } from "./repositories/homework-watch-record.repository";
import { HomeworkQueueRepository } from "./repositories/homework-queue.repository";
import { LessonModule } from "../lesson/lesson.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([HomeworkProgress, HomeworkWatchRecord, HomeworkQueue]),
    SharedModule,
    HomeworkModule,
    UserModule,
    BlockModule,
    UserHomeworkProgressModule,
    LessonModule,
    forwardRef(() => LessonProgressModule), // forwardRef() bilan import qilingan
    ScheduleModule.forRoot(), // Cron job uchun ScheduleModule ni qo'shamiz
  ],
  controllers: [HomeworkProgressController],
  providers: [
    { provide: "IHomeworkProgressService", useClass: HomeworkProgressService },
    {
      provide: "IHomeworkProgressRepository",
      useClass: HomeworkProgressRepository,
    },
    HomeworkWatchRecordRepository, // HomeworkWatchRecordRepository ni qo'shamiz
    HomeworkQueueRepository, // HomeworkQueueRepository ni qo'shamiz
  ],
  exports: [
    { provide: "IHomeworkProgressService", useClass: HomeworkProgressService },
    {
      provide: "IHomeworkProgressRepository",
      useClass: HomeworkProgressRepository,
    },
    HomeworkWatchRecordRepository, // HomeworkWatchRecordRepository ni export qilamiz
    HomeworkQueueRepository, // HomeworkQueueRepository ni export qilamiz
  ],
})
export class HomeworkProgressModule {}
