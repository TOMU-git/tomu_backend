import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TransactionEntity } from "./entities/transaction.entity";
import { UserModule } from "../user/user.module";
import { TariffModule } from "../tariff/tariff.module";
import { TransactionRepository } from "./transactions.repository";
import { OrdersModule } from "../orders/orders.module";
import { LiveChatModule } from "../live-chat/live-chat.module";
import { UserTariffModule } from "../user-tariff/user-tariff.module";
import { UserCoursesModule } from "../user-courses/user-courses.module";
import { CourseModule } from "../course/course.module";
import { CoursePaymentHistoryModule } from "../course-payment-history/course-payment-history.module";
import { LivechatPaymentHistoryModule } from "../livechat-payment-history/livechat-payment-history.module";
import { UserLivechatsModule } from "../user-livechats/user-livechats.module";
import { AiModule } from "../ai/ai.module";
import { GroupModule } from "../group/group.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionEntity]),
    UserModule,
    OrdersModule,
    LiveChatModule,
    TariffModule,
    UserTariffModule,
    UserCoursesModule,
    CourseModule,
    CoursePaymentHistoryModule,
    LivechatPaymentHistoryModule,
    UserLivechatsModule,
    AiModule, // AI limit reset uchun
    GroupModule, // Guruhga qo'shish uchun
  ],
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
export class TransactionsModule { }
