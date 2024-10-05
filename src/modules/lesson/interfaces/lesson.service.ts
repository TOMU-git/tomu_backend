import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { Lesson } from '../entities/lesson.entity';
import { CreateLessonDto } from '../dto/create-Lesson.dto';
import { UpdateLessonDto } from '../dto/update-Lesson.dto';

export interface ILessonService {
  create(dto: CreateLessonDto): Promise<ResData<Lesson>>;
  findAll(): Promise<ResData<Array<Lesson>>>;
  findOneById(id: ID): Promise<ResData<Lesson>>;
  update(id: ID, dto: UpdateLessonDto): Promise<ResData<Lesson>>;
  create(dto: CreateLessonDto): Promise<ResData<Lesson>>;
  delete(id: ID): Promise<ResData<Lesson>>;
}
