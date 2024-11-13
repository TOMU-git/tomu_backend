import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Inject } from '@nestjs/common';
import { CreateUserLivechatDto } from './dto/create-user-livechat.dto';
import { IUserLiveChatService } from './interfaces/user-livechat-service.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('user-livechat')
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

  @Get('teacher/:teacherId')
  async findUserLiveChatsByTeacherId(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return await this.userLivechatsService.getUserLiveChatsByTeacherId(teacherId);
  }
}
