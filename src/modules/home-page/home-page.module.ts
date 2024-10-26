import { Module } from "@nestjs/common";
import { HomePageService } from "./home-page.service";
import { HomePageController } from "./home-page.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HomePage } from "./entities/home-page.entity";
import { HomePageRepository } from "./home-page.repository";
import { SharedModule } from "../shared/shared.module";
import { FileModule } from "../file/file.module";

@Module({
  imports: [TypeOrmModule.forFeature([HomePage]), SharedModule, FileModule],
  controllers: [HomePageController],
  providers: [
    { provide: "IHomePageService", useClass: HomePageService },
    { provide: "IHomePageRepository", useClass: HomePageRepository },
  ],
})
export class HomePageModule {}
