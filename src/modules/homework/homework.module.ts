import { Module } from "@nestjs/common";
import { HomeworkService } from "./homework.service";
import { HomeworkController } from "./homework.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Homework } from "./entities/homework.entity";
import { HomeworkRepository } from "./homework.repository";
import { SharedModule } from "../shared/shared.module";
import { VimeoService } from '../lesson/vimeo.service';
import { BlockModule } from "../block/block.module";

@Module({
  imports: [TypeOrmModule.forFeature([Homework]), SharedModule, BlockModule],
  controllers: [HomeworkController],
  providers: [
    VimeoService,
    { provide: 'IHomeworkService', useClass: HomeworkService },
    { provide: 'IHomeworkRepository', useClass: HomeworkRepository },
  ],
  exports: [
    { provide: "IHomeworkService", useClass: HomeworkService },
    { provide: "IHomeworkRepository", useClass: HomeworkRepository },
  ],
})
export class HomeworkModule {}
