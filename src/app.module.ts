import { MiddlewareConsumer, Module, NestModule, RequestMethod } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeedbackModule } from "./modules/feedback/feedback.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { TariffModule } from "./modules/tariff/tariff.module";
import { UserCoursesModule } from "./modules/user-courses/user-courses.module";
import { FileModule } from "./modules/file/file.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CourseModule } from "./modules/course/course.module";
import { BlockModule } from "./modules/block/block.module";
import { LessonModule } from "./modules/lesson/lesson.module";
import { GrammarModule } from "./modules/grammar/grammar.module";
import { UserModule } from "./modules/user/user.module";
import { UserTariffModule } from "./modules/user-tariff/user-tariff.module";
import { HomePageModule } from "./modules/home-page/home-page.module";
import { connectionSource } from "./common/config/database.config";
import { LessonProgressModule } from "./modules/lesson-progress/lesson-progress.module";
import { HomeworkProgressModule } from "./modules/homework-progress/homework-progress.module";
import { join } from "path";
import { ServeStaticModule } from "@nestjs/serve-static";
import { AlphabetModule } from "./modules/alphabet/alphabet.module";
import { LiveChatModule } from "./modules/live-chat/live-chat.module";
import { TransactionsModule } from "./modules/transactions/transactions.module";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule } from "@nestjs/config";
import { CourseVideoModule } from './modules/course-video/course-video.module';
import { CheckTokenMiddleware } from "./common/middleware/transaction-middleware";
import { TransactionsController } from "./modules/transactions/transactions.controller";
import { HomeworkModule } from "./modules/homework/homework.module";
import { OrdersModule } from './modules/orders/orders.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".development.env"],
    }),
    CacheModule.register({isGlobal: true}),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "upload"),
      serveRoot: "/upload",
    }),
    TypeOrmModule.forRoot(connectionSource),
    AuthModule,
    CourseModule,
    FeedbackModule,
    PaymentModule,
    TariffModule,
    UserCoursesModule,
    FileModule,
    LessonModule,
    BlockModule,
    GrammarModule,
    HomeworkModule,
    HomePageModule,
    CourseModule,
    BlockModule,
    UserModule,
    UserTariffModule,
    LessonProgressModule,
    HomeworkProgressModule,
    AlphabetModule,
    LiveChatModule,
    TransactionsModule,
    CourseVideoModule,
    OrdersModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CheckTokenMiddleware)
      .exclude({ path: "transactions", method: RequestMethod.POST })
      .forRoutes(TransactionsController);
  }
}
