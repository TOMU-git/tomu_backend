import { Test, TestingModule } from '@nestjs/testing';
import { LivechatPaymentHistoryService } from './livechat-payment-history.service';

describe('LivechatPaymentHistoryService', () => {
  let service: LivechatPaymentHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LivechatPaymentHistoryService],
    }).compile();

    service = module.get<LivechatPaymentHistoryService>(LivechatPaymentHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
