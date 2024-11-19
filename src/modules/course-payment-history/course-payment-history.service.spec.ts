import { Test, TestingModule } from '@nestjs/testing';
import { CoursePaymentHistoryService } from './course-payment-history.service';

describe('CoursePaymentHistoryService', () => {
  let service: CoursePaymentHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursePaymentHistoryService],
    }).compile();

    service = module.get<CoursePaymentHistoryService>(CoursePaymentHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
