import { Module } from "@nestjs/common";
import { LiveChatService } from "./live-chat.service";
import { LiveChatController } from "./live-chat.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LiveChatEntity } from "./entities/live-chat.entity";
import { UserModule } from "../user/user.module";
import { LiveChatRepository } from "./live-chat.repository";

@Module({
  imports: [TypeOrmModule.forFeature([LiveChatEntity]), UserModule],
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
