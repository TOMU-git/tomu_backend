import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { CourseVideo } from '../entities/course-video.entity';
export interface ICourseVideoService {
  create(video?: Express.Multer.File): Promise<ResData<CourseVideo>>;
  findAll(): Promise<ResData<Array<CourseVideo>>>;
  delete(id: ID): Promise<ResData<CourseVideo>>;
}
