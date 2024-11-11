import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionEntity } from "./entities/transaction.entity";
import { UserModule } from "../user/user.module";
import { TariffModule } from "../tariff/tariff.module";
import { TransactionRepository } from "./transactions.repository";
import { OrdersModule } from "../orders/orders.module";

@Module({
imports: [TypeOrmModule.forFeature([TransactionEntity]), UserModule,  OrdersModule],
  controllers: [TransactionsController],
  providers: [
    { provide: "ITransactionServcie", useClass: TransactionsService },
    { provide: "ITransactionRepository", useClass: TransactionRepository },
  ],
  exports: [
    { provide: "ITransactionServcie", useClass: TransactionsService },
    { provide: "ITransactionRepository", useClass: TransactionRepository },
  ],
})
export class TransactionsModule {}
