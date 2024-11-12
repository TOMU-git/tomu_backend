import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserHomeworkProgress } from "./entities/user-homework-progress.entity";
import { UserHomeworkProgressRepository } from "./user-homework-progress.repository";

@Module({
  imports: [TypeOrmModule.forFeature([UserHomeworkProgress])],
  providers: [
    {
      provide: "IUserHomeworkProgressRepository",
      useClass: UserHomeworkProgressRepository,
    },
  ],
  exports: [
    {
      provide: "IUserHomeworkProgressRepository",
      useClass: UserHomeworkProgressRepository,
    },
  ],
})
export class UserHomeworkProgressModule {}
