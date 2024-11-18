import { Controller, Body, Param, Put, ParseIntPipe, Inject } from '@nestjs/common';
import { UpdateLivechatPriceDto } from './dto/update-livechat-price.dto';
import { ILiveChatPriceService } from './interfaces/livechat-price-service.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('livechat-price')
@Controller('livechat-price')
export class LivechatPriceController {
  constructor(@Inject("ILiveChatPriceService")private readonly livechatPriceService: ILiveChatPriceService) {}

  @Put('update/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateLivechatPriceDto: UpdateLivechatPriceDto) {
    return this.livechatPriceService.update(id, updateLivechatPriceDto);
  }
}
