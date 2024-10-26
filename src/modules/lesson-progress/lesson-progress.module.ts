import { Module } from "@nestjs/common";
import { LessonProgressService } from "./lesson-progress.service";
import { LessonProgressController } from "./lesson-progress.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { LessonProgressRepository } from "./lesson-progress.repository";
import { SharedModule } from "../shared/shared.module";
import { LessonModule } from "../lesson/lesson.module";
import { UserModule } from "../user/user.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([LessonProgress]),
    SharedModule,
    LessonModule,
    UserModule,
  ],
  controllers: [LessonProgressController],
  providers: [
    { provide: "ILessonProgressService", useClass: LessonProgressService },
    {
      provide: "ILessonProgressRepository",
      useClass: LessonProgressRepository,
    },
  ],
})
export class LessonProgressModule {}
