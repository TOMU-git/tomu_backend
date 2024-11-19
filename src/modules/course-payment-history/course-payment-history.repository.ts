import { InjectRepository } from "@nestjs/typeorm";
import { ICoursePaymentRepository } from "./interfaces/course-payment-repository.interface";
import { CoursePaymentHistoryEntity } from "./entities/course-payment-history.entity";
import { Repository } from "typeorm";

export class CoursePaymentRepository implements ICoursePaymentRepository {
  constructor(
    @InjectRepository(CoursePaymentHistoryEntity)
    private readonly coursePaymentRepository: Repository<CoursePaymentHistoryEntity>,
  ) {}

  async getAll(): Promise<CoursePaymentHistoryEntity[]> {
    return await this.coursePaymentRepository.find();
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
