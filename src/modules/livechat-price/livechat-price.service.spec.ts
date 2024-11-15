import { Test, TestingModule } from '@nestjs/testing';
import { LivechatPriceService } from './livechat-price.service';

describe('LivechatPriceService', () => {
  let service: LivechatPriceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LivechatPriceService],
    }).compile();

    service = module.get<LivechatPriceService>(LivechatPriceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
