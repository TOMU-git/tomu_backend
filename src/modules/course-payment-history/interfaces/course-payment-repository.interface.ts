import { CoursePaymentHistoryEntity } from "../entities/course-payment-history.entity";

export interface ICoursePaymentRepository {
    getAll(limit: number, page: number): Promise<ICourseCount>;
    getOne(id: number): Promise<CoursePaymentHistoryEntity>;
    create(entity: CoursePaymentHistoryEntity): Promise<CoursePaymentHistoryEntity>;
    delete(id: number): Promise<CoursePaymentHistoryEntity>;
}

export interface ICourseCount {
    data: Array<CoursePaymentHistoryEntity>;
    count: number;
  }