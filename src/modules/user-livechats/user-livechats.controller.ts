import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Inject } from '@nestjs/common';
import { CreateUserLivechatDto } from './dto/create-user-livechat.dto';
import { IUserLiveChatService } from './interfaces/user-livechat-service.interface';

@Controller('user-livechats')
export class UserLivechatsController {
  constructor(@Inject("IUserLiveChatService") private readonly userLivechatsService: IUserLiveChatService) {}

  @Post('create')
  async create(@Body() createUserLivechatDto: CreateUserLivechatDto) {
    return await this.userLivechatsService.createUserLiveChat(createUserLivechatDto);
  }

  @Get()
  async findAllAcceptedLiveChats() {
    return await this.userLivechatsService.getAllUserLiveChats();
  }

  @Get('user/:userId')
  async findUserLiveChats(@Param('userId', ParseIntPipe) userId: number) {
    return await this.userLivechatsService.getUserLiveChatsByUserId(userId);
  }
}
