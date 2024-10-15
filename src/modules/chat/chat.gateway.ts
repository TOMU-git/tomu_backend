import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CreateChatDto } from './dto/create-chat.dto';
import { ChatService } from './chat.service';
import { ResData } from 'src/lib/resData';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Client'ga kirish huquqini bering (CORS ni sozlash)
  },
})
export class ChatGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService)) // forwardRef yordamida injektsiya qilamiz
    private readonly chatService: ChatService,
  ) {}

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createChatDto: CreateChatDto,
    @ConnectedSocket() client: Socket,
  ): Promise<ResData<any>> {
    const chat = await this.chatService.create(createChatDto);
    this.server.emit('receiveMessage', chat);
    return new ResData('Message sent successfully', 201, chat);
  }

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
