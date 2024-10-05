import { Module } from '@nestjs/common';
import { config } from './common/config';
import { User } from './modules/user/entities/user.entity';
import { Feedback } from './modules/feedback/entities/feedback.entity';
import { Payment } from './modules/payment/entities/payment.entity';
import { Progress } from './modules/progress/entities/progress.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './modules/tariff/entities/tariff.entity';
import { UserCourse } from './modules/user-courses/entities/user-course.entity';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ProgressModule } from './modules/progress/progress.module';
import { TariffModule } from './modules/tariff/tariff.module';
import { UserCoursesModule } from './modules/user-courses/user-courses.module';
import { LiveChat } from './modules/live-chat/entities/live-chat.entity';
import { LiveChatModule } from './modules/live-chat/live-chat.module';
import { FileModule } from './modules/file/file.module';
import { File } from './modules/file/entities/file.entity';
import { AuthModule } from './modules/auth/auth.module';
import { HomeworkModule } from './modules/homework/homework.module';
import { CourseModule } from './modules/course/course.module';
import { Course } from './modules/course/entities/course.entity';
import { BlockModule } from './modules/block/block.module';
import { Block } from './modules/block/entities/block.entity';
import { Lesson } from './modules/lesson/entities/lesson.entity';
import { Grammar } from './modules/grammar/entities/grammar.entity';
import { LessonModule } from './modules/lesson/lesson.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { Homework } from './modules/homework/entities/homework.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: config.database_host,
      port: config.database_port,
      username: config.database_user,
      password: config.database_password,
      database: config.database,
      entities: [
        User,
        Course,
        Lesson,
        Grammar,
        Homework,
        Block,
        Feedback,
        Payment,
        Progress,
        Tariff,
        UserCourse,
        LiveChat,
        File,
      ],
      synchronize: true,
    }),
    AuthModule,
    CourseModule,
    FeedbackModule,
    PaymentModule,
    ProgressModule,
    TariffModule,
    UserCoursesModule,
    LiveChatModule,
    FileModule,
    LessonModule,
    BlockModule,
    GrammarModule,
    HomeworkModule,
    CourseModule,
    BlockModule,
  ],
})
export class AppModule {}
