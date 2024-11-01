import { Inject, Injectable } from "@nestjs/common";
import { CreateLessonDto } from "./dto/create-lesson.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { Lesson } from "./entities/lesson.entity";
import { ILessonRepository } from "./interfaces/lesson.repository";
import { ResData } from "../../lib/resData";
import { ID } from "../../common/types/type";
import { ILessonService } from "./interfaces/lesson.service";
import {
  LessonAlreadyExistException,
  LessonNotFoundException,
  LessonOrderAlreadyExistException,
} from './exception/lesson.exception';
import { VimeoService } from './vimeo.service';
import { IBlockRepository } from '../block/interfaces/block.repository';

@Injectable()
export class LessonService implements ILessonService {
  constructor(
    @Inject("ILessonRepository")
    private readonly lessonRepository: ILessonRepository,

    @Inject('IBlockRepository')
    private readonly blockRepository: IBlockRepository,

    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

  async create(
    dto: CreateLessonDto,
    file: Express.Multer.File,
  ): Promise<ResData<Lesson>> {
    const foundData = await this.lessonRepository.findOneByName(dto.title);
    if (foundData) {
      throw new LessonAlreadyExistException();
    }

    const orderExist = await this.lessonRepository.findOneByOrder(
      dto.order,
      dto.blockId,
    );

    if (orderExist) {
      throw new LessonOrderAlreadyExistException();
    }

    const block = await this.blockRepository.findById(dto.blockId);
    
    const { videoUrl, duration } = await this.vimeoService.uploadVideo(
      file.buffer,
      dto.title,
      'Dars videosi',
    );
    block.duration = Number(block.duration) + Number(duration);
    block.countVideos = Number(block.countVideos) + 1;
    await this.blockRepository.update(block)
    
    const newLesson = new Lesson();
    Object.assign(newLesson, {
      ...dto,
      block,
      videoUrl,
      mimetype: file.mimetype,
      size: file.size,
      duration, // Video davomiyligini saqlash
    });

    const savedLesson = await this.lessonRepository.create(newLesson);

    return new ResData<Lesson>(
      "Dars muvaffaqiyatli yaratildi",
      201,
      savedLesson,
    );
  }

  async findVideos(id: number): Promise<ResData<Lesson[]>> {
    const foundVideos = await this.lessonRepository.findVideosTen(id);
    return new ResData<Lesson[]>(
      "Boshlang'ich 10 ta darslar",
      200,
      foundVideos,
    );
  }

  async findAll(): Promise<ResData<Array<Lesson>>> {
    const data = await this.lessonRepository.findAll();
    return new ResData<Array<Lesson>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Lesson>> {
    const foundData = await this.lessonRepository.findById(id);
    if (!foundData) {
      throw new LessonNotFoundException();
    }

    return new ResData<Lesson>("ok", 200, foundData);
  }

  async getLessonsByBlockId(blockId: ID): Promise<ResData<Lesson[]>> {
    const lessons = await this.lessonRepository.findLessonsByBlockId(blockId);
    return new ResData<Lesson[]>(
      "Lessons by blockId fetched successfully",
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

    if(dto.blockId){
      const block = await this.blockRepository.findById(dto.blockId);
      foundData.block = block
    }

    const updateData = {
      order: dto.order ? parseInt(dto.order.toString(), 10) : foundData.order,
      title: dto.title === '' ? foundData.title : dto.title || undefined, // Bo'sh bo'lsa, undefined ga o'zgartirish
      video: dto.video === '' ? undefined : dto.video || foundData.videoUrl, // Bo'sh bo'lsa, undefined ga o'zgartirish
    };

    // Faqat order o'zgartirilgan bo'lsa, tekshirish
    if (updateData.order && updateData.order !== foundData.order) {
      const orderExist = await this.lessonRepository.findOneByOrder(
        updateData.order,
        dto.blockId,
      );

      // Agar bazada shu order va blockId kombinatsiyasi mavjud bo'lsa, xatolik chiqarish
      if (orderExist) {
        throw new LessonOrderAlreadyExistException();
      }
    }

    // Agar fayl bo'lsa, video URL'ini yangilaydi
    if (file) {
      const { videoUrl, duration } = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title || foundData.title, // Title ni videoni yuklashda ishlatish
        'Dars videosi',
      );

      foundData.videoUrl = videoUrl;
      foundData.duration = duration;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    // Boshqa maydonlarni yangilash
    Object.assign(foundData, updateData);

    const data = await this.lessonRepository.update(foundData);

    return new ResData<Lesson>("Lesson updated successfully", 200, data);
  }

  async delete(id: ID): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.lessonRepository.delete(foundData);

    return new ResData<Lesson>("Lesson deleted successfully", 200, data);
  }
}
