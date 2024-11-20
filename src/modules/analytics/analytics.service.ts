import { Inject, Injectable } from '@nestjs/common';
import { ITransactionRepo } from '../transactions/interfaces/transaction-repo';
import { IResponseData } from './interfaces/analytics-service.interface';
import { ResData } from 'src/lib/resData';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject("ITransactionRepository") private readonly transactionsRepository: ITransactionRepo 
  ) {}
  async findAll(): Promise<IResponseData>{
    const foundLiveChatAmount = await this.transactionsRepository.getAllByLiveChatId()
    let liveChatAmount = 0;
    for (let index = 0; index < foundLiveChatAmount.length; index++) {
      const element = foundLiveChatAmount[index];
      liveChatAmount = liveChatAmount + Number(element.amount)
    }
    const foundTariffAmount = await this.transactionsRepository.getAllByTariffId()
    let tariffAmount = 0;
    for (let index = 0; index < foundTariffAmount.length; index++) {
      const element = foundTariffAmount[index];
      tariffAmount = tariffAmount + Number(element.amount)
    }
    
    const totalPrice = liveChatAmount + tariffAmount;
    
    return {course_total: tariffAmount, livechat_total: liveChatAmount, total_profit: totalPrice}
  }

  async findOne(id: number) {
    return `This action returns a #${id} analytics`;
  }
}
