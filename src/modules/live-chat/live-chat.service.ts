import { Injectable } from '@nestjs/common';
import { CreateLiveChatDto } from './dto/create-live-chat.dto';
import { UpdateLiveChatDto } from './dto/update-live-chat.dto';

@Injectable()
export class LiveChatService {
  create(createLiveChatDto: CreateLiveChatDto) {
    return 'This action adds a new liveChat';
  }

  findAll() {
    return `This action returns all liveChat`;
  }

  findOne(id: number) {
    return `This action returns a #${id} liveChat`;
  }

  update(id: number, updateLiveChatDto: UpdateLiveChatDto) {
    return `This action updates a #${id} liveChat`;
  }

  remove(id: number) {
    return `This action removes a #${id} liveChat`;
  }
}
