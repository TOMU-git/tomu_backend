import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CoursePaymentHistoryEntity } from './entities/course-payment-history.entity';
import { ICoursePaymentService } from './interfaces/course-payment-service.interface';
import { ResData } from 'src/lib/resData';
import { ICoursePaymentRepository } from './interfaces/course-payment-repository.interface';

@Injectable()
export class CoursePaymentHistoryService implements ICoursePaymentService  {
  constructor(
    @Inject("ICoursePaymentRepository") private readonly coursePaymentRepository: ICoursePaymentRepository
  ) {}
  async findAll(): Promise<ResData<CoursePaymentHistoryEntity[]>> {
    const foundAllCoursePayments = await this.coursePaymentRepository.getAll();
    return new ResData<CoursePaymentHistoryEntity[]>(
      "All available course payments",
      200,
      foundAllCoursePayments
    );
  }

  async findOneById(id: number): Promise<ResData<CoursePaymentHistoryEntity>> {
    const foundCoursePayment = await this.coursePaymentRepository.getOne(id);
    if (!foundCoursePayment) {
      throw new HttpException("Course payment not found", HttpStatus.NOT_FOUND);
    }
    return new ResData<CoursePaymentHistoryEntity>("Found course payment", 200, foundCoursePayment);
  }
}
