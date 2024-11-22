import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ResData } from 'src/lib/resData';
import { LivechatPaymentHistoryEntity } from './entities/livechat-payment-history.entity';
import { ILiveChatPaymentRepository } from './interfaces/livechat-payment-repository.interface';
import { ILiveChatCountResponse } from './interfaces/livechat-payment-service.interface';

@Injectable()
export class LivechatPaymentHistoryService {
  constructor(
    @Inject("ILiveChatPaymentRepository") private readonly liveChatPaymentRepository: ILiveChatPaymentRepository
  ) {}
  async findAll(limit: number, page: number): Promise<ResData<ILiveChatCountResponse>> {
    limit = limit > 0 ? limit : 10;
    page = page > 0 ? page : 1;
    page = (page - 1) * limit;
    const foundLiveChatPayments = await this.liveChatPaymentRepository.getAll(limit, page);
    const totalPage = foundLiveChatPayments.count / 10;
    return new ResData<ILiveChatCountResponse>("All available live chat payments", 200, {count: foundLiveChatPayments.count, data: foundLiveChatPayments.data, total_page: Math.ceil(totalPage)});
  }

  async findOneById(id: number): Promise<ResData<LivechatPaymentHistoryEntity>> {
    const foundLiveChatPayment = await this.liveChatPaymentRepository.getOne(id);
    if (!foundLiveChatPayment) {
      throw new HttpException("Livechat payment not found", HttpStatus.NOT_FOUND);
    }
    return new ResData<LivechatPaymentHistoryEntity>("found live chat payment", 200, foundLiveChatPayment);
  }
}
