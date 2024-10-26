import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SharedModule } from "../shared/shared.module";
import { Alphabet } from "./entities/alphabet.entity";
import { VimeoService } from "../lesson/vimeo.service";
import { AlphabetService } from "./alphabet.service";
import { AlphabetRepository } from "./alphabet.repository";
import { AlphabetController } from "./alphabet.controller";
import { CourseModule } from "../course/course.module";

@Module({
  imports: [TypeOrmModule.forFeature([Alphabet]), SharedModule, CourseModule],
  controllers: [AlphabetController],
  providers: [
    VimeoService,
    { provide: "IAlphabetService", useClass: AlphabetService },
    { provide: "IAlphabetRepository", useClass: AlphabetRepository },
  ],
})
export class AlphabetModule {}
