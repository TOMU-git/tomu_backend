import { MiddlewareConsumer, Module, NestModule, RequestMethod, OnModuleInit } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeedbackModule } from "./modules/feedback/feedback.module";
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
import { UserLivechatsModule } from './modules/user-livechats/user-livechats.module';
import { UserHomeworkProgressModule } from "./modules/user-homework-progress/user-homework-progress.module";
import { UserProgressModule } from './modules/user-progress/user-progress.module';
import { LivechatPriceModule } from './modules/livechat-price/livechat-price.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CoursePaymentHistoryModule } from './modules/course-payment-history/course-payment-history.module';
import { LivechatPaymentHistoryModule } from './modules/livechat-payment-history/livechat-payment-history.module';
import { AiModule } from './modules/ai/ai.module';
import { ChromaService } from './modules/ai/services/chroma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".development.env"],
    }),
    CacheModule.register({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "upload"),
      serveRoot: "/upload",
    }),
    // Minimal front: AI PTT demo page
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public", "ai-demo"),
      serveRoot: "/ai-demo",
    }),
    TypeOrmModule.forRoot(connectionSource),
    AuthModule,
    CourseModule,
    FeedbackModule,
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
    UserLivechatsModule,
    UserHomeworkProgressModule,
    UserProgressModule,
    LivechatPriceModule,
    AnalyticsModule,
    CoursePaymentHistoryModule,
    LivechatPaymentHistoryModule,
    AiModule,
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(private readonly chromaService: ChromaService) { }

  async onModuleInit() {
    // Auto-index lessons on server startup (for Memory Index)
    if (process.env.USE_RAG === '1') {
      console.log('🚀 [AppModule] Auto-indexing lessons on startup...');
      try {
        const result = await this.chromaService.indexCourse({ courseId: 1 });
        console.log(`✅ [AppModule] Indexed ${result.indexed} chunks on startup`);
      } catch (error) {
        console.error(`❌ [AppModule] Auto-indexing failed: ${error.message}`);
      }
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CheckTokenMiddleware)
      .exclude({ path: "transactions", method: RequestMethod.POST })
      .forRoutes(TransactionsController);
  }
}
