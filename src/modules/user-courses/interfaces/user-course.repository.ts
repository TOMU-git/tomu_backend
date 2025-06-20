// interfaces/user-course.repository.ts

import { ID } from "src/common/types/type";
import { UserCourse } from "../entities/user-course.entity";

export interface IUserCourseRepository {
  create(dto: UserCourse): Promise<UserCourse>;
  findAll(): Promise<Array<UserCourse>>;
  update(entity: UserCourse): Promise<UserCourse>;
  delete(entity: UserCourse): Promise<UserCourse>;
  findById(id: ID): Promise<UserCourse | null>;
  findByTariffIdAndUserId(userId: number, courseId: number): Promise<UserCourse>;
  findByUserId(userId: ID): Promise<Array<UserCourse>>;
  findByCourseId(courseId: ID): Promise<Array<UserCourse>>;
  findByUserIdAndCourseId(
    userId: number,
    courseId: number,
  ): Promise<UserCourse | null> 
}
