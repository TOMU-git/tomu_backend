import { Inject, Injectable } from '@nestjs/common';
import { CreateChatDto } from './dto/create-chat.dto';
import { UpdateChatDto } from './dto/update-chat.dto';
import { Chat } from './entities/chat.entity';
import { IChatRepository } from './interfaces/chat.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { IChatService } from './interfaces/chat.service';
import { ChatNotFoundException } from './exception/chat.exception';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService implements IChatService {
  constructor(
    @Inject('IChatRepository')
    private readonly chatRepository: IChatRepository,
    private readonly chatGateway: ChatGateway,
  ) {}

  async create(createChatDto: CreateChatDto): Promise<ResData<Chat>> {
    const newChat = new Chat();
    newChat.message = createChatDto.message;

    const savedChat = await this.chatRepository.create(newChat);

    // Xabarni Socket.IO orqali barcha mijozlarga yuborish
    this.chatGateway.server.emit('receiveMessage', savedChat);

    return new ResData<Chat>(
      'Chat message created successfully',
      201,
      savedChat,
    );
  }

  async findAll(): Promise<ResData<Array<Chat>>> {
    const chats = await this.chatRepository.findAll();

    return new ResData<Array<Chat>>('ok', 200, chats);
  }

  async findOneById(id: ID): Promise<ResData<Chat>> {
    const foundChat = await this.chatRepository.findById(id);
    if (!foundChat) {
      throw new ChatNotFoundException();
    }

    return new ResData<Chat>('ok', 200, foundChat);
  }

  async update(id: ID, updateChatDto: UpdateChatDto): Promise<ResData<Chat>> {
    const { data: foundChat } = await this.findOneById(id);

    // Yangilanish uchun `updateChatDto` ni tekshirish
    const updatedChat = Object.assign(foundChat, updateChatDto);
    const savedChat = await this.chatRepository.update(updatedChat);

    return new ResData<Chat>('Chat updated successfully', 200, savedChat);
  }

  async delete(id: ID): Promise<ResData<Chat>> {
    const { data: foundChat } = await this.findOneById(id);
    const deletedChat = await this.chatRepository.delete(foundChat);

    return new ResData<Chat>('Chat deleted successfully', 200, deletedChat);
  }
}
