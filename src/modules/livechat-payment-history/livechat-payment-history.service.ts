import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ResData } from 'src/lib/resData';
import { LivechatPaymentHistoryEntity } from './entities/livechat-payment-history.entity';
import { ILiveChatPaymentRepository } from './interfaces/livechat-payment-repository.interface';

@Injectable()
export class LivechatPaymentHistoryService {
  constructor(
    @Inject("ILiveChatPaymentRepository") private readonly liveChatPaymentRepository: ILiveChatPaymentRepository
  ) {}
  async findAll(): Promise<ResData<LivechatPaymentHistoryEntity[]>> {
    const foundLiveChatPayments = await this.liveChatPaymentRepository.getAll();
    return new ResData<LivechatPaymentHistoryEntity[]>("All available live chat payments", 200, foundLiveChatPayments);
  }

  async findOneById(id: number): Promise<ResData<LivechatPaymentHistoryEntity>> {
    const foundLiveChatPayment = await this.liveChatPaymentRepository.getOne(id);
    if (!foundLiveChatPayment) {
      throw new HttpException("Livechat payment not found", HttpStatus.NOT_FOUND);
    }
    return new ResData<LivechatPaymentHistoryEntity>("found live chat payment", 200, foundLiveChatPayment);
  }
}
