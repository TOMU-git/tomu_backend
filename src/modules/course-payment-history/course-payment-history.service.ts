import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CoursePaymentHistoryEntity } from './entities/course-payment-history.entity';
import { ICourseEntityCount, ICoursePaymentService } from './interfaces/course-payment-service.interface';
import { ResData } from 'src/lib/resData';
import { ICoursePaymentRepository } from './interfaces/course-payment-repository.interface';

@Injectable()
export class CoursePaymentHistoryService implements ICoursePaymentService  {
  constructor(
    @Inject("ICoursePaymentRepository") private readonly coursePaymentRepository: ICoursePaymentRepository
  ) {}
  async findAll(limit: number, page: number): Promise<ResData<ICourseEntityCount>> {
    limit = limit > 0 ? limit : 10;
    page = page > 0 ? page : 1;
    page = (page - 1) * limit;
    const foundAllCoursePayments = await this.coursePaymentRepository.getAll(limit, page);
    const totalPage = foundAllCoursePayments.count / 10;
    return new ResData<ICourseEntityCount>(
      "All available course payments",
      200,
      {count: foundAllCoursePayments.count, data: foundAllCoursePayments.data, total_page: Math.ceil(totalPage)}
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
