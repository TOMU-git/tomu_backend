import { CoursePaymentHistoryEntity } from "../entities/course-payment-history.entity";

export interface ICoursePaymentRepository {
    getAll(): Promise<CoursePaymentHistoryEntity[]>;
    getOne(id: number): Promise<CoursePaymentHistoryEntity>;
    create(entity: CoursePaymentHistoryEntity): Promise<CoursePaymentHistoryEntity>;
    delete(id: number): Promise<CoursePaymentHistoryEntity>;
}