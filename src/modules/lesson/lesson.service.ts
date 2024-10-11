import { Inject, Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson } from './entities/lesson.entity';
import { ILessonRepository } from './interfaces/lesson.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { ILessonService } from './interfaces/lesson.service';
import {
  LessonAlreadyExistException,
  LessonNotFoundException,
} from './exception/lesson.exception';
import { VimeoService } from './vimeo.service';

@Injectable()
export class LessonService implements ILessonService {
  constructor(
    @Inject('ILessonRepository')
    private readonly lessonRepository: ILessonRepository,
    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

  async create(
    dto: CreateLessonDto,
    file: Express.Multer.File,
  ): Promise<ResData<Lesson>> {
    console.log('in service', file);

    const foundData = await this.lessonRepository.findOneByName(dto.title);
    if (foundData) {
      throw new LessonAlreadyExistException();
    }

    // video_url ni yuklanadigan video faylning URL ga aylantirish
    const videoUrl = await this.vimeoService.uploadVideo(
      file.buffer, // Faylni buffer orqali yuklash
      dto.title,
      'Dars videosi',
      file.size, // Faylning o'lchamini olish
    );

    const newLesson = new Lesson();
    Object.assign(newLesson, {
      ...dto,
      video_url: videoUrl,
      mimetype: file.mimetype,
      size: file.size,
    }); // Size ni qo'shish

    const savedLesson = await this.lessonRepository.create(newLesson);

    return new ResData<Lesson>(
      'Dars muvaffaqiyatli yaratildi',
      201,
      savedLesson,
    );
  }

  async findAll(): Promise<ResData<Array<Lesson>>> {
    const data = await this.lessonRepository.findAll();
    return new ResData<Array<Lesson>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Lesson>> {
    const foundData = await this.lessonRepository.findById(id);
    if (!foundData) {
      throw new LessonNotFoundException();
    }

    return new ResData<Lesson>('ok', 200, foundData);
  }

  async update(id: ID, dto: UpdateLessonDto): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, dto);
    const data = await this.lessonRepository.update(updatedData);

    return new ResData<Lesson>('Lesson updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.lessonRepository.delete(foundData);

    return new ResData<Lesson>('Lesson deleted successfully', 200, data);
  }
}
