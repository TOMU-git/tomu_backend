import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { CreateCourseDto } from "../dto/create-course.dto";
import { UpdateCourseDto } from "../dto/update-course.dto";
import { Course } from "../entities/course.entity";
import { User } from "src/modules/user/entities/user.entity";

export interface ICourseService {
  create(
    dto: CreateCourseDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Course>>;
  findAll(user?: User): Promise<ResData<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }>>>;
  findOneById(id: ID, user?: User): Promise<ResData<Course & { isActiveForUser: boolean; subscriptionStatus: string; alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }>>;
  update(
    id: ID,
    dto: UpdateCourseDto,
    file: Express.Multer.File,
    video?: Express.Multer.File,
  ): Promise<ResData<Partial<Course>>>;
  create(dto: CreateCourseDto): Promise<ResData<Course>>;
  delete(id: ID): Promise<ResData<Course>>;
}
