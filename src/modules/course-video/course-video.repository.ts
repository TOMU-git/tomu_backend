import { Injectable } from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CourseVideo } from './entities/course-video.entity';
import { ICourseVideoRepository } from './interfaces/course-video.repository';

@Injectable()
export class CourseVideoRepository implements ICourseVideoRepository {
  constructor(
    @InjectRepository(CourseVideo)
    private courseRepository: Repository<CourseVideo>,
  ) {}

  async create(dto: CourseVideo): Promise<CourseVideo> {
    const newCourseVideo = await this.courseRepository.create(dto);
    await this.courseRepository.save(newCourseVideo);
    return newCourseVideo;
  }
  async findById(id: ID): Promise<CourseVideo | null> {
    return await this.courseRepository.findOneBy({ id });
  }
  async delete(entity: CourseVideo): Promise<CourseVideo> {
    return await this.courseRepository.remove(entity);
  }

  async findAll(): Promise<Array<CourseVideo>> {
    return await this.courseRepository.find();
  }
}
