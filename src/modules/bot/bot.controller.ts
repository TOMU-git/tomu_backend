import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TelegramBotService } from './bot.service';


@Controller('bot')
export class BotController {
  constructor(private readonly botService: TelegramBotService) {}

}
