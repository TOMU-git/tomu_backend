import { Inject, Injectable } from '@nestjs/common';
import { ICourseVideoRepository } from './interfaces/course-video.repository';
import { VimeoService } from '../lesson/vimeo.service';
import { CourseVideo } from './entities/course-video.entity';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { CourseNotFoundException } from '../course/exception/course.exception';

@Injectable()
export class CourseVideoService {
  constructor(
    @Inject('ICourseVideoRepository')
    private readonly courseVideoRepository: ICourseVideoRepository,
    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

  async create(file: Express.Multer.File): Promise<ResData<CourseVideo>> {
     const { videoUrl, duration } = await this.vimeoService.uploadVideo(
       file.buffer,
       file.filename,
       'Dars videosi',
       // file.size,
     );

    const newCourseVideo = new CourseVideo();
    Object.assign(newCourseVideo, {
      videoUrl,
      mimetype: file.mimetype,
      size: file.size,
    });

    const savedCourseVideo =
      await this.courseVideoRepository.create(newCourseVideo);

    return new ResData<CourseVideo>(
      'Course videosi muvaffaqiyatli yaratildi',
      201,
      savedCourseVideo,
    );
  }

  async findOneById(id: ID): Promise<ResData<CourseVideo>> {
    const foundData = await this.courseVideoRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }

    return new ResData<CourseVideo>('ok', 200, foundData);
  }

  async findAll(): Promise<ResData<Array<CourseVideo>>> {
    const data = await this.courseVideoRepository.findAll();
    return new ResData<Array<CourseVideo>>('ok', 200, data);
  }

  async delete(id: ID): Promise<ResData<CourseVideo>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.courseVideoRepository.delete(foundData);

    return new ResData<CourseVideo>(
      'CourseVideo deleted successfully',
      200,
      data,
    );
  }
}
