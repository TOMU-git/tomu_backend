import { Module, forwardRef } from "@nestjs/common";
import { LessonProgressService } from "./lesson-progress.service";
import { LessonProgressController } from "./lesson-progress.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { LessonProgressRepository } from "./lesson-progress.repository";
import { SharedModule } from "../shared/shared.module";
import { LessonModule } from "../lesson/lesson.module";
import { UserModule } from "../user/user.module";
import { BlockModule } from "../block/block.module";
import { HomeworkProgressModule } from "../homework-progress/homework-progress.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgress]),
    SharedModule,
    LessonModule,
    UserModule,
    BlockModule,
    forwardRef(() => HomeworkProgressModule), // forwardRef() bilan import qilingan
  ],
  controllers: [LessonProgressController],
  providers: [
    { provide: "ILessonProgressService", useClass: LessonProgressService },
    {
      provide: "ILessonProgressRepository",
      useClass: LessonProgressRepository,
    },
  ],
  exports: [
    { provide: "ILessonProgressService", useClass: LessonProgressService },
    {
      provide: "ILessonProgressRepository",
      useClass: LessonProgressRepository,
    },
  ],
})
export class LessonProgressModule {}
