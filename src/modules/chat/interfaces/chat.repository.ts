import { ID } from 'src/common/types/type';
import { Chat } from '../entities/chat.entity';

export interface IChatRepository {
  create(dto: Chat): Promise<Chat>;
  findAll(): Promise<Array<Chat>>;
  update(entity: Chat): Promise<Chat>;
  delete(entity: Chat): Promise<Chat>;
  findById(id: ID): Promise<Chat | null>;
}
