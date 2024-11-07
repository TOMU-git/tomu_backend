import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { LessonProgress } from "../entities/lesson-progress.entity";
import { UpdateLessonProgressDto } from "../dto/update-lesson-progress.dto";
import { CreateLessonProgressDto } from "../dto/create-lesson-progress.dto";

export interface ILessonProgressService {
  create(dto: CreateLessonProgressDto): Promise<ResData<LessonProgress>>;
  findAll(): Promise<ResData<LessonProgress[]>>;
  test(uId: ID, bId: ID): Promise<ResData<Array<LessonProgress>>>;
  findOneById(id: ID): Promise<ResData<LessonProgress>>;
  update(
    id: ID,
    dto: UpdateLessonProgressDto,
  ): Promise<ResData<LessonProgress>>;

  getVideos(userId: ID, blockId: ID, blockOrder: ID): Promise<ResData<Array<LessonProgress>>>;
}
