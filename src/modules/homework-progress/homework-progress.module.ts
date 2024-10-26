import { Module } from "@nestjs/common";
import { HomeworkProgressService } from "./homework-progress.service";
import { HomeworkProgressController } from "./homework-progress.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { SharedModule } from "../shared/shared.module";
import { HomeworkModule } from "../homework/homework.module";
import { UserModule } from "../user/user.module";
import { HomeworkProgressRepository } from "./homework-progress.repository";

@Module({
  imports: [
    TypeOrmModule.forFeature([HomeworkProgress]),
    SharedModule,
    HomeworkModule,
    UserModule,
  ],
  controllers: [HomeworkProgressController],
  providers: [
    { provide: "IHomeworkProgressService", useClass: HomeworkProgressService },
    {
      provide: "IHomeworkProgressRepository",
      useClass: HomeworkProgressRepository,
    },
  ],
})
export class HomeworkProgressModule {}
