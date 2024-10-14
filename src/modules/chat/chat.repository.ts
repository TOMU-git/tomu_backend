import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IChatRepository } from './interfaces/chat.repository';
import { Chat } from './entities/chat.entity';

@Injectable()
export class ChatRepository implements IChatRepository {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {}

  async create(dto: Chat): Promise<Chat> {
    const newChat = await this.chatRepository.create(dto);
    await this.chatRepository.save(newChat);
    return newChat;
  }

  async findAll(): Promise<Array<Chat>> {
    return await this.chatRepository.find();
  }

  async update(entity: Chat): Promise<Chat> {
    return await this.chatRepository.save(entity);
  }

  async delete(entity: Chat): Promise<Chat> {
    return await this.chatRepository.remove(entity);
  }

  async findById(id: ID): Promise<Chat | null> {
    return await this.chatRepository.findOneBy({ id });
  }
}
