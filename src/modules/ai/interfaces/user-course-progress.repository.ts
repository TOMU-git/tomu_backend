import { UserCourseProgress } from "../entities/user-course-progress.entity";
import { ID } from "src/common/types/type";

export interface IUserCourseProgressRepository {
    create(entity: UserCourseProgress): Promise<UserCourseProgress>;
    findOneById(id: ID): Promise<UserCourseProgress | null>;
    findByUserId(userId: ID): Promise<UserCourseProgress[]>;
    findByUserIdAndCourseId(userId: ID, courseId: ID): Promise<UserCourseProgress | null>;
    findByActiveCourses(userId: ID): Promise<UserCourseProgress[]>;
    update(entity: UserCourseProgress): Promise<UserCourseProgress>;
    delete(id: ID): Promise<UserCourseProgress>;
    findAll(): Promise<UserCourseProgress[]>;
}
