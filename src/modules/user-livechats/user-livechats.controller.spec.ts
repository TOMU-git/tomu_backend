import { Test, TestingModule } from '@nestjs/testing';
import { UserLivechatsController } from './user-livechats.controller';
import { UserLivechatsService } from './user-livechats.service';

describe('UserLivechatsController', () => {
  let controller: UserLivechatsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserLivechatsController],
      providers: [UserLivechatsService],
    }).compile();

    controller = module.get<UserLivechatsController>(UserLivechatsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
