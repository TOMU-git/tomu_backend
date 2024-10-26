import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { Lesson } from "../entities/lesson.entity";
import { UpdateLessonDto } from "../dto/update-lesson.dto";
import { CreateLessonDto } from "../dto/create-lesson.dto";

export interface ILessonService {
  create(
    dto: CreateLessonDto,
    file: Express.Multer.File,
  ): Promise<ResData<Lesson>>;
  findAll(): Promise<ResData<Lesson[]>>;
  findVideos(id: number): Promise<ResData<Lesson[]>>;
  findOneById(id: ID): Promise<ResData<Lesson>>;
  getLessonsByBlockId(blockId: ID): Promise<ResData<Lesson[]>>;
  update(
    id: ID,
    dto: UpdateLessonDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Lesson>>;
  delete(id: ID): Promise<ResData<Lesson>>;
}
