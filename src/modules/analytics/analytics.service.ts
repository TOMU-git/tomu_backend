import { Inject, Injectable } from '@nestjs/common';
import { ITransactionRepo } from '../transactions/interfaces/transaction-repo';
import { IResponseData } from './interfaces/analytics-service.interface';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject("ITransactionRepository") private readonly transactionsRepository: ITransactionRepo 
  ) {}
  async findAll(){
    const foundLiveChatAmount = await this.transactionsRepository.getAllByLiveChatId()
    const foundTariffAmount = await this.transactionsRepository.getAllByTariffId()
    let amount = 0;
    for (let index = 0; index < foundTariffAmount.length; index++) {
      const element = foundTariffAmount[index];
      amount = amount + Number(element.amount)
    }
  }

  async findOne(id: number) {
    return `This action returns a #${id} analytics`;
  }
}
