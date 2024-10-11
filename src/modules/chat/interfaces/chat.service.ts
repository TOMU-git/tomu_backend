import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { Chat } from '../entities/chat.entity';
import { CreateChatDto } from '../dto/create-chat.dto';
import { UpdateChatDto } from '../dto/update-chat.dto';

export interface IChatService {
  create(dto: CreateChatDto): Promise<ResData<Chat>>;
  findAll(): Promise<ResData<Array<Chat>>>;
  findOneById(id: ID): Promise<ResData<Chat>>;
  update(id: ID, dto: UpdateChatDto): Promise<ResData<Chat>>;
  delete(id: ID): Promise<ResData<Chat>>;
}
