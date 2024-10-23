import { CourseVideo } from '../entities/course-video.entity';
import { ID } from 'src/common/types/type';

export interface ICourseVideoRepository {
  create(dto: CourseVideo): Promise<CourseVideo>;
  delete(entity: CourseVideo): Promise<CourseVideo>;
  findById(id: ID): Promise<CourseVideo | null>;
  findAll(): Promise<Array<CourseVideo | null>>;
}
