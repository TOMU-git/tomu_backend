import { Module } from '@nestjs/common';
import { UserLivechatsService } from './user-livechats.service';
import { UserLivechatsController } from './user-livechats.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLivechatEntity } from './entities/user-livechat.entity';
import { UserModule } from '../user/user.module';
import { LiveChatModule } from '../live-chat/live-chat.module';
import { UserLiveChatRepository } from './user-livechats.repository';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [TypeOrmModule.forFeature([UserLivechatEntity]), UserModule, LiveChatModule, CourseModule],
  controllers: [UserLivechatsController],
  providers: [
    { provide: "IUserLiveChatService", useClass: UserLivechatsService },
    {provide: "IUserLiveChatRepository", useClass: UserLiveChatRepository}
  ],
  exports: [
    { provide: "IUserLiveChatService", useClass: UserLivechatsService },
    { provide: "IUserLiveChatRepository", useClass: UserLiveChatRepository },
  ],
})
export class UserLivechatsModule {}
