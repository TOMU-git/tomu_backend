import { ID } from "src/common/types/type";
import { Course } from "../entities/course.entity";

export interface ICourseRepository {
  create(dto: Course): Promise<Course>;
  findAll(): Promise<Array<Course>>;
  findAllWithCounts(userId?: number): Promise<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }>>;
  update(entity: Course): Promise<Course>;
  delete(entity: Course): Promise<Course>;
  findById(id: ID): Promise<Course | null>;
  findByIdWithCounts(id: ID): Promise<(Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }) | null>;
  findOneByName(title: string): Promise<Course | null>;
}
