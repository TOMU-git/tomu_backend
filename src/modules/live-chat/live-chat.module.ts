import { Module } from "@nestjs/common";
import { LiveChatService } from "./live-chat.service";
import { LiveChatController } from "./live-chat.controller";

@Module({
  controllers: [LiveChatController],
  providers: [LiveChatService],
})
export class LiveChatModule {}
