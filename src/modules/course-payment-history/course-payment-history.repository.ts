import { InjectRepository } from "@nestjs/typeorm";
import { ICourseCount, ICoursePaymentRepository } from "./interfaces/course-payment-repository.interface";
import { CoursePaymentHistoryEntity } from "./entities/course-payment-history.entity";
import { Repository } from "typeorm";

export class CoursePaymentRepository implements ICoursePaymentRepository {
  constructor(
    @InjectRepository(CoursePaymentHistoryEntity)
    private readonly coursePaymentRepository: Repository<CoursePaymentHistoryEntity>,
  ) {}

  async getAll(limit: number, offset: number): Promise<ICourseCount> {
    const foundCoursesPayments = await this.coursePaymentRepository.find({ take: limit, skip: offset });
    const count = await this.coursePaymentRepository
    .createQueryBuilder("course_payment")
    .select("COUNT(*) count")
    .getRawOne();
    return {count: parseInt(count.count, 10) , data: foundCoursesPayments}
  }

  async getOne(id: number): Promise<CoursePaymentHistoryEntity> {
    return await this.coursePaymentRepository.findOneBy({ id });
  }

  async create(
    entity: CoursePaymentHistoryEntity,
  ): Promise<CoursePaymentHistoryEntity> {
    return await this.coursePaymentRepository.save(entity);
  }

  async delete(id: number): Promise<CoursePaymentHistoryEntity> {
    const coursePayment = await this.coursePaymentRepository.findOneBy({ id });
    await this.coursePaymentRepository.delete(id);
    return coursePayment;
  }
}
