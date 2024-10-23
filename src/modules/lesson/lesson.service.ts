import { Inject, Injectable } from '@nestjs/common';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Lesson } from './entities/lesson.entity';
import { ILessonRepository } from './interfaces/lesson.repository';
import { ResData } from '../../lib/resData';
import { ID } from '../../common/types/type';
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

  async findVideos(id: number): Promise<ResData<Lesson[]>> {
    const foundVideos = await this.lessonRepository.findVideosTen(id);
    return new ResData<Lesson[]>("Boshlang'ich 10 ta darslar", 200, foundVideos);
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

  async getLessonsByBlockId(blockId: ID): Promise<ResData<Lesson[]>> {
    const lessons = await this.lessonRepository.findLessonsByBlockId(blockId);
    return new ResData<Lesson[]>(
      'Lessons by blockId fetched successfully',
      200,
      lessons,
    );
  }

  async update(
    id: ID,
    dto: UpdateLessonDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);

    // Agar fayl bo'lsa, video URL'ini yangilaydi
    if (file) {
      console.log('Video fayl yuklanmoqda...', file);

      // Yangi video faylni yuklaydi
      const videoUrl = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title || foundData.title, // Yangilanishlarda title bo'lmasa eski title'ni saqlab qolish
        'Dars videosi',
        file.size,
      );

      // Eski videoning ma'lumotlarini yangilaydi
      foundData.video_url = videoUrl;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    // Boshqa maydonlarni yangilash
    Object.assign(foundData, dto);

    const data = await this.lessonRepository.update(foundData);

    return new ResData<Lesson>('Lesson updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.lessonRepository.delete(foundData);

    return new ResData<Lesson>('Lesson deleted successfully', 200, data);
  }
}
