import { Inject, Injectable } from '@nestjs/common';
import { ITransactionRepo } from '../transactions/interfaces/transaction-repo';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject("ITransactionRepository") private readonly transactionsRepository: ITransactionRepo 
  ) {}
  async findAll() {
    return "trerrrer"
  }

  async findOne(id: number) {
    return `This action returns a #${id} analytics`;
  }
}
