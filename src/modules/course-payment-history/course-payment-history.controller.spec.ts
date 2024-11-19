import { Test, TestingModule } from '@nestjs/testing';
import { CoursePaymentHistoryController } from './course-payment-history.controller';
import { CoursePaymentHistoryService } from './course-payment-history.service';

describe('CoursePaymentHistoryController', () => {
  let controller: CoursePaymentHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoursePaymentHistoryController],
      providers: [CoursePaymentHistoryService],
    }).compile();

    controller = module.get<CoursePaymentHistoryController>(CoursePaymentHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
