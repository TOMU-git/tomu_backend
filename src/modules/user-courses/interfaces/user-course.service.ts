import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { UserCourse } from "../entities/user-course.entity";
import { CreateUserCourseDto } from "../dto/create-user-course.dto";
import { UpdateUserCourseDto } from "../dto/update-user-course.dto";

export interface IUserCourseService {
  create(dto: CreateUserCourseDto): Promise<ResData<Partial<UserCourse>>>;
  findAll(): Promise<ResData<Array<UserCourse>>>;
  findByDate(id: number, day: Date, courseId: number): Promise<ResData<{isActive: boolean}>>;
  findOneById(id: ID): Promise<ResData<UserCourse>>;
  findOneByUserId(id: ID): Promise<ResData<Array<UserCourse>>>;
  update(id: ID, dto: UpdateUserCourseDto): Promise<ResData<UserCourse>>;
  delete(id: ID): Promise<ResData<UserCourse>>;
}
