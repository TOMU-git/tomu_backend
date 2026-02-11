import { Module } from "@nestjs/common";
import { GrammarService } from "./grammar.service";
import { GrammarController } from "./grammar.controller";
import { Grammar } from "./entities/grammar.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GrammarRepository } from "./grammar.repository";
import { SharedModule } from "../shared/shared.module";
import { CourseModule } from '../course/course.module';
import { VimeoService } from "../lesson/vimeo.service";
import { UserCoursesModule } from "../user-courses/user-courses.module";

@Module({
  imports: [TypeOrmModule.forFeature([Grammar]), SharedModule, CourseModule, UserCoursesModule],
  controllers: [GrammarController],
  providers: [
    VimeoService,
    { provide: "IGrammarService", useClass: GrammarService },
    { provide: "IGrammarRepository", useClass: GrammarRepository },
  ],
  exports: [
    "IGrammarRepository",
  ],
})
export class GrammarModule { }
