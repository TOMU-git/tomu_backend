import { Module } from "@nestjs/common";
import { LivechatPriceService } from "./livechat-price.service";
import { LivechatPriceController } from "./livechat-price.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LivechatPriceEntity } from "./entities/livechat-price.entity";
import { LiveChatPriceRepository } from "./livechat-price.repository";

@Module({
  imports: [TypeOrmModule.forFeature([LivechatPriceEntity])],
  controllers: [LivechatPriceController],
  providers: [
    { provide: "ILiveChatPriceService", useClass: LivechatPriceService },
    { provide: "ILiveChatPriceRepository", useClass: LiveChatPriceRepository },
  ],
  exports: [
    { provide: "ILiveChatPriceService", useClass: LivechatPriceService },
    { provide: "ILiveChatPriceRepository", useClass: LiveChatPriceRepository },
  ],
})
export class LivechatPriceModule {}
