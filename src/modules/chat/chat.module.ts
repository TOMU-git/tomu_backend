import { Module, forwardRef } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat } from './entities/chat.entity';
import { ChatRepository } from './chat.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Chat])],
  controllers: [ChatController],
  providers: [
    {
      provide: 'IChatRepository',
      useClass: ChatRepository,
    },
    {
      provide: 'IChatService',
      useClass: ChatService,
    },
    ChatService, // Qo'shildi
    ChatGateway,
  ],
  exports: [ChatService], // E'lon qilindi
})
export class ChatModule {}
