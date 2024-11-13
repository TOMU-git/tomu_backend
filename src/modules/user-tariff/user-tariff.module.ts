import { Module } from "@nestjs/common";
import { UserTariffService } from "./user-tariff.service";
import { UserTariffController } from "./user-tariff.controller";
import { UserTariffRepository } from "./user-tariff.repository";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserTariff } from "./entities/user-tariff.entity";
import { UserModule } from "../user/user.module";
import { TariffModule } from "../tariff/tariff.module";

@Module({
  imports: [TypeOrmModule.forFeature([UserTariff]), UserModule, TariffModule],
  controllers: [UserTariffController],
  providers: [
    { provide: "IUserTariffService", useClass: UserTariffService },
    { provide: "IUserTariffRepository", useClass: UserTariffRepository },
  ],
  exports: [
    { provide: "IUserTariffService", useClass: UserTariffService },
    { provide: "IUserTariffRepository", useClass: UserTariffRepository },
  ],
})
export class UserTariffModule {}
