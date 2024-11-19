import { ResData } from "src/lib/resData";
import { CoursePaymentHistoryEntity } from "../entities/course-payment-history.entity";

export interface ICoursePaymentService {
    findAll(): Promise<ResData<CoursePaymentHistoryEntity[]>>;
    findOneById(id: number): Promise<ResData<CoursePaymentHistoryEntity>>;
}