import { Module } from '@nestjs/common';
import { config } from './common/config';
import { User } from './modules/user/entities/user.entity';
import { Feedback } from './modules/feedback/entities/feedback.entity';
import { Payment } from './modules/payment/entities/payment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './modules/tariff/entities/tariff.entity';
import { UserCourse } from './modules/user-courses/entities/user-course.entity';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TariffModule } from './modules/tariff/tariff.module';
import { UserCoursesModule } from './modules/user-courses/user-courses.module';
import { LiveChat } from './modules/live-chat/entities/live-chat.entity';
import { LiveChatModule } from './modules/live-chat/live-chat.module';
import { FileModule } from './modules/file/file.module';
import { File } from './modules/file/entities/file.entity';
import { AuthModule } from './modules/auth/auth.module';
import { CourseModule } from './modules/course/course.module';
import { Course } from './modules/course/entities/course.entity';
import { BlockModule } from './modules/block/block.module';
import { Block } from './modules/block/entities/block.entity';
import { Lesson } from './modules/lesson/entities/lesson.entity';
import { Grammar } from './modules/grammar/entities/grammar.entity';
import { LessonModule } from './modules/lesson/lesson.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { UserModule } from './modules/user/user.module';
import { UserTariffModule } from './modules/user-tariff/user-tariff.module';
import { UserTariff } from './modules/user-tariff/entities/user-tariff.entity';
import { ChatModule } from './modules/chat/chat.module';
import { Chat } from './modules/chat/entities/chat.entity';
import { Homework } from './modules/homework/entities/homework.entity';
import { HomeworkModule } from './modules/homework/homework.module';
import { HomePage } from './modules/home-page/entities/home-page.entity';
import { HomePageModule } from './modules/home-page/home-page.module';
import { connectionSource } from './common/config/database.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(connectionSource,
    ),
    AuthModule,
    CourseModule,
    FeedbackModule,
    PaymentModule,
    TariffModule,
    UserCoursesModule,
    LiveChatModule,
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
    ChatModule,
  ],
})
export class AppModule {}
