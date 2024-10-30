import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { CreateCourseDto } from "../dto/create-course.dto";
import { UpdateCourseDto } from "../dto/update-course.dto";
import { Course } from "../entities/course.entity";

export interface ICourseService {
  create(
    dto: CreateCourseDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Course>>;
  findAll(): Promise<ResData<Array<Course>>>;
  findOneById(id: ID): Promise<ResData<Course>>;
  update(
    id: ID,
    dto: UpdateCourseDto,
    file: Express.Multer.File,
    video?: Express.Multer.File,
  ): Promise<ResData<Partial<Course>>>;
  create(dto: CreateCourseDto): Promise<ResData<Course>>;
  delete(id: ID): Promise<ResData<Course>>;
}
