import { Test, TestingModule } from '@nestjs/testing';
import { LivechatPriceController } from './livechat-price.controller';
import { LivechatPriceService } from './livechat-price.service';

describe('LivechatPriceController', () => {
  let controller: LivechatPriceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LivechatPriceController],
      providers: [LivechatPriceService],
    }).compile();

    controller = module.get<LivechatPriceController>(LivechatPriceController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
