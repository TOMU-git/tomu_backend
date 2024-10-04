import { Module } from '@nestjs/common';
import { config } from './common/config';
import { User } from './modules/user/entities/user.entity';
import { Course } from './modules/courses/entities/course.entity';
import { Feedback } from './modules/feedback/entities/feedback.entity';
import { Payment } from './modules/payment/entities/payment.entity';
import { Progress } from './modules/progress/entities/progress.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tariff } from './modules/tariff/entities/tariff.entity';
import { UserCourse } from './modules/user-courses/entities/user-course.entity';
import { CoursesModule } from './modules/courses/courses.module';
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
    CoursesModule,
    FeedbackModule,
    PaymentModule,
    ProgressModule,
    TariffModule,
    UserCoursesModule,
    LiveChatModule,
    FileModule,
  ],
})
export class AppModule {}
