import { Test, TestingModule } from '@nestjs/testing';
import { UserLivechatsService } from './user-livechats.service';

describe('UserLivechatsService', () => {
  let service: UserLivechatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserLivechatsService],
    }).compile();

    service = module.get<UserLivechatsService>(UserLivechatsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
