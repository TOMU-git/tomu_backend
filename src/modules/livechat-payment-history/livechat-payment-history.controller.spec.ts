import { Test, TestingModule } from '@nestjs/testing';
import { LivechatPaymentHistoryController } from './livechat-payment-history.controller';
import { LivechatPaymentHistoryService } from './livechat-payment-history.service';

describe('LivechatPaymentHistoryController', () => {
  let controller: LivechatPaymentHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivechatPaymentHistoryController],
      providers: [LivechatPaymentHistoryService],
    }).compile();

    controller = module.get<LivechatPaymentHistoryController>(LivechatPaymentHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
