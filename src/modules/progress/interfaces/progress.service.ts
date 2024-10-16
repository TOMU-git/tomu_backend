import { ResData } from '../../../lib/resData';
import { ID } from '../../../common/types/type';
import { Progress } from '../entities/progress.entity';
import { CreateProgressDto } from '../dto/create-progress.dto';
import { UpdateProgressDto } from '../dto/update-progress.dto';

export interface IProgressService {
  create(dto: CreateProgressDto): Promise<ResData<Progress>>;
  findAll(): Promise<ResData<Progress[]>>;
  findOneById(id: ID): Promise<ResData<Progress>>;
  update(id: ID, dto: UpdateProgressDto): Promise<ResData<Progress>>;
  delete(id: ID): Promise<ResData<Progress>>;
  findByUserAndLesson(userId: ID, lessonId: ID): Promise<ResData<Progress>>;
  findByUserAndHomework(userId: ID, homeworkId: ID): Promise<ResData<Progress>>;
}
