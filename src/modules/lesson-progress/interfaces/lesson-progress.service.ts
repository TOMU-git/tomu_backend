import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { LessonProgress } from "../entities/lesson-progress.entity";
import { UpdateLessonProgressDto } from "../dto/update-lesson-progress.dto";

export interface ILessonProgressService {
  findAll(): Promise<ResData<LessonProgress[]>>;
  findOneById(id: ID): Promise<ResData<LessonProgress>>;
  update(
    id: ID,
  ): Promise<ResData<LessonProgress>>;

  getVideos(userId: ID, blockId: ID): Promise<ResData<Array<LessonProgress>>>;

  checkDailyLessonsLimit(userId: ID): Promise<number>

  
}
