import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { ResData } from 'src/lib/resData';
import { Chat } from './entities/chat.entity';
import { IChatService } from './interfaces/chat.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';

@ApiTags('chat')
@Controller('chat')
export class ChatController {
  constructor(
    @Inject('IChatService')
    private readonly chatService: IChatService,
  ) {}

  @ApiBearerAuth()
  @Post()
  async create(@Body() createChatDto: CreateChatDto): Promise<ResData<Chat>> {
    return await this.chatService.create(createChatDto);
  }

  @ApiBearerAuth()
  @Get()
  async findAll(): Promise<ResData<Array<Chat>>> {
    return await this.chatService.findAll();
  }

  @ApiBearerAuth()
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Chat>> {
    return await this.chatService.findOneById(id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateChatDto: UpdateChatDto,
  ): Promise<ResData<Chat>> {
    return await this.chatService.update(id, updateChatDto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Chat>> {
    return await this.chatService.delete(id);
  }
}
