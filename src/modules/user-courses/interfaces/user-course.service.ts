import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { UserCourse } from "../entities/user-course.entity";
import { CreateUserCourseDto } from "../dto/create-user-course.dto";
import { UpdateUserCourseDto } from "../dto/update-user-course.dto";
import { Course } from "src/modules/course/entities/course.entity";

// UserCourse with enriched course data (including counts)
export type UserCourseWithCounts = Omit<UserCourse, 'course'> & {
  course: Course & {
    alphabetCount?: number;
    lessonCount?: number;
    grammarCount?: number;
    homeworkCount?: number;
  };
};

export interface IUserCourseService {
  create(dto: CreateUserCourseDto): Promise<ResData<Partial<UserCourse>>>;
  findAll(): Promise<ResData<Array<UserCourse>>>;
  findByDate(userId: number, day: Date, courseId: number): Promise<ResData<{ isActive: boolean, hasEverPaid: boolean }>>;
  findOneById(id: ID): Promise<ResData<UserCourse>>;
  findOneByUserId(id: ID): Promise<ResData<Array<UserCourseWithCounts>>>;
  update(id: ID, dto: UpdateUserCourseDto): Promise<ResData<UserCourse>>;
  delete(id: ID): Promise<ResData<UserCourse>>;
}
