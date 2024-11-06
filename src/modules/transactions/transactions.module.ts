import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionEntity } from "./entities/transaction.entity";
import { UserModule } from "../user/user.module";
import { TariffModule } from "../tariff/tariff.module";

@Module({
imports: [TypeOrmModule.forFeature([TransactionEntity]), UserModule, TariffModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
