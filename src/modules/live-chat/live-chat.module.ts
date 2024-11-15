import { Module } from "@nestjs/common";
import { LiveChatService } from "./live-chat.service";
import { LiveChatController } from "./live-chat.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LiveChatEntity } from "./entities/live-chat.entity";
import { UserModule } from "../user/user.module";
import { LiveChatRepository } from "./live-chat.repository";
import { CourseModule } from "../course/course.module";
import { LivechatPriceModule } from "../livechat-price/livechat-price.module";

@Module({
  imports: [TypeOrmModule.forFeature([LiveChatEntity]), UserModule, CourseModule, LivechatPriceModule],
  controllers: [LiveChatController],
  providers: [
    { provide: "ILiveChatService", useClass: LiveChatService },
    { provide: "ILiveChatRepository", useClass: LiveChatRepository },
  ],
  exports: [
    { provide: "ILiveChatService", useClass: LiveChatService },
    { provide: "ILiveChatRepository", useClass: LiveChatRepository },
  ],
})
export class LiveChatModule {}
