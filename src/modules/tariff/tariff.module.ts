import { Module } from "@nestjs/common";
import { TariffService } from "./tariff.service";
import { TariffController } from "./tariff.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Tariff } from "./entities/tariff.entity";
import { TariffRepository } from "./tariff.repository";
import { CourseModule } from "../course/course.module";
import { SharedModule } from "../shared/shared.module";

@Module({
  imports: [TypeOrmModule.forFeature([Tariff]), CourseModule, SharedModule],
  controllers: [TariffController],
  providers: [
    { provide: "ITariffService", useClass: TariffService },
    { provide: "ITariffRepository", useClass: TariffRepository },
  ],
  exports: [
    { provide: "ITariffService", useClass: TariffService },
    { provide: "ITariffRepository", useClass: TariffRepository },
  ],
})
export class TariffModule {}
