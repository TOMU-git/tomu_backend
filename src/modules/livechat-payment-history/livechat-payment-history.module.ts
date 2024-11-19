import { Module } from '@nestjs/common';
import { LivechatPaymentHistoryService } from './livechat-payment-history.service';
import { LivechatPaymentHistoryController } from './livechat-payment-history.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LivechatPaymentHistoryEntity } from './entities/livechat-payment-history.entity';
import { LiveChatPaymentRepository } from './livechat-payment-history.repository';

@Module({
  imports: [TypeOrmModule.forFeature([LivechatPaymentHistoryEntity])],
  controllers: [LivechatPaymentHistoryController],
  providers: [
    { provide: "ILiveChatPaymentService", useClass: LivechatPaymentHistoryService },
    {provide: "ILiveChatPaymentRepository", useClass: LiveChatPaymentRepository}
  ],
  exports: [
    { provide: "ILiveChatPaymentService", useClass: LivechatPaymentHistoryService },
    { provide: "ILiveChatPaymentRepository", useClass: LiveChatPaymentRepository}
  ],
})
export class LivechatPaymentHistoryModule {}
