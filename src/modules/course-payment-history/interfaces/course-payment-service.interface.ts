import { ResData } from "src/lib/resData";
import { CoursePaymentHistoryEntity } from "../entities/course-payment-history.entity";

export interface ICoursePaymentService {
    findAll(limit: number, page: number): Promise<ResData<ICourseEntityCount>>;
    findOneById(id: number): Promise<ResData<CoursePaymentHistoryEntity>>;
}



export interface ICourseEntityCount {
    data: CoursePaymentHistoryEntity[];
    count: number;
    total_page: number;
  }