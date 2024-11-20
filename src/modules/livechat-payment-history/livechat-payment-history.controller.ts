import { Controller, Get, Inject, Param, ParseIntPipe } from '@nestjs/common';
import { ILiveChatPaymentService } from './interfaces/livechat-payment-service.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('livechat-payment-history')
@Controller('livechat-payment-history')
export class LivechatPaymentHistoryController {
  constructor(@Inject("ILiveChatPaymentService") private readonly livechatPaymentHistoryService: ILiveChatPaymentService) {}
  @Get()
  findAll() {
    return this.livechatPaymentHistoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.livechatPaymentHistoryService.findOneById(id);
  }
}
