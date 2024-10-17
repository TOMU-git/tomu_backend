import { Module, OnModuleInit } from '@nestjs/common';
import { TelegramBotService } from './bot.service';

@Module({
  providers: [TelegramBotService],
})
export class BotModule implements OnModuleInit {
  constructor(private readonly telegramBotService: TelegramBotService) {}

  onModuleInit() {
    this.telegramBotService.init();
  }
}
