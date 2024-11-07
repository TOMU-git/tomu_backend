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
} from "./exception/lesson.exception";
import { VimeoService } from "./vimeo.service";
import { IBlockRepository } from "../block/interfaces/block.repository";

// `LessonService` klassi, ILessonService interfeysini implementatsiya qiladi va darslarni boshqarish uchun asosiy servis vazifasini bajaradi.
@Injectable()
export class LessonService implements ILessonService {
  constructor(
    @Inject("ILessonRepository") // ILessonRepository injektsiya qilinadi
    private readonly lessonRepository: ILessonRepository,

    @Inject("IBlockRepository") // IBlockRepository injektsiya qilinadi
    private readonly blockRepository: IBlockRepository,

    private readonly vimeoService: VimeoService, // Vimeo xizmatini yuklash uchun VimeoService injektsiya qilinadi
  ) {}

  /**
   * Yangi dars yaratish funksiyasi.
   * Dars nomini va tartib raqamini tekshiradi, mavjud bo'lsa, xato beradi.
   * Video faylni yuklaydi va blokda videolar soni va davomiyligini yangilaydi.
   * @param dto Darsni yaratish uchun DTO
   * @param file Yuklangan video fayl
   * @returns Yangi yaratilgan dars
   */
  async create(
    dto: CreateLessonDto,
    file: Express.Multer.File,
  ): Promise<ResData<Lesson>> {
    console.log("working")
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

    // Video faylni Vimeo'ga yuklab, URL va davomiyligini oladi
    const { videoUrl, duration } = await this.vimeoService.uploadVideo(
      file.buffer,
      dto.title,
      "Dars videosi",
    );

    // Blockda videolar soni va umumiy davomiylikni yangilash
    block.duration = Number(block.duration) + Number(duration);
    block.countVideos = Number(block.countVideos) + 1;
    await this.blockRepository.update(block);

    // Yangi dars obyekti yaratish
    const newLesson = new Lesson();
    Object.assign(newLesson, {
      ...dto,
      block,
      videoUrl,
      mimetype: file.mimetype,
      size: file.size,
      duration,
    });

    // Darsni saqlash
    const savedLesson = await this.lessonRepository.create(newLesson);

    return new ResData<Lesson>(
      "Dars muvaffaqiyatli yaratildi",
      201,
      savedLesson,
    );
  }

  /**
   * Boshlang'ich 10 ta darsni blok ID bo'yicha olish funksiyasi.
   * @param id Blok ID'si
   * @returns 10 ta dars ro'yxati
   */
  async findVideos(id: number): Promise<ResData<Lesson[]>> {
    const foundVideos = await this.lessonRepository.findVideosTen(id);
    return new ResData<Lesson[]>(
      "Boshlang'ich 10 ta darslar",
      200,
      foundVideos,
    );
  }

  /**
   * Hamma darslarni olish funksiyasi.
   * @returns Barcha darslar ro'yxati
   */
  async findAll(): Promise<ResData<Array<Lesson>>> {
    const data = await this.lessonRepository.findAll();
    return new ResData<Array<Lesson>>("ok", 200, data);
  }

  /**
   * Berilgan ID bo'yicha darsni topish.
   * Topilmasa, xato chiqaradi.
   * @param id Dars ID'si
   * @returns Topilgan dars
   */
  async findOneById(id: ID): Promise<ResData<Lesson>> {
    const foundData = await this.lessonRepository.findById(id);
    if (!foundData) {
      throw new LessonNotFoundException();
    }

    return new ResData<Lesson>("ok", 200, foundData);
  }

  /**
   * Berilgan blok ID'siga tegishli barcha darslarni olish funksiyasi.
   * @param blockId Blok ID'si
   * @returns Blokga tegishli darslar
   */
  async getLessonsByBlockId(blockId: ID): Promise<ResData<Lesson[]>> {
    const lessons = await this.lessonRepository.findLessonsByBlockId(blockId);
    return new ResData<Lesson[]>(
      "Lessons by blockId fetched successfully",
      200,
      lessons,
    );
  }

  /**
   * Darsni yangilash funksiyasi.
   * Agar yangi fayl berilsa, videoni yangilaydi.
   * @param id Dars ID'si
   * @param dto Darsni yangilash uchun DTO
   * @param file (ixtiyoriy) Yangilangan video fayl
   * @returns Yangilangan dars
   */
  async update(
    id: ID,
    dto: UpdateLessonDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);

    // Agar blockId berilgan bo'lsa, yangi blokni darsga bog'lash
    if (dto.blockId) {
      const block = await this.blockRepository.findById(dto.blockId);
      foundData.block = block;
    }

    // Yangilash ma'lumotlarini tayyorlash
    const updateData = {
      order: dto.order ? parseInt(dto.order.toString(), 10) : foundData.order,
      title: dto.title === "" ? foundData.title : dto.title || undefined,
      video: dto.video === "" ? undefined : dto.video || foundData.videoUrl,
    };

    // Faqat order o'zgartirilganida tekshirish
    if (updateData.order && updateData.order !== foundData.order) {
      const orderExist = await this.lessonRepository.findOneByOrder(
        updateData.order,
        dto.blockId,
      );
      if (orderExist) {
        throw new LessonOrderAlreadyExistException();
      }
    }

    // Yangi fayl bo'lsa, videoni yangilash
    if (file) {
      const { videoUrl, duration } = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title || foundData.title,
        "Dars videosi",
      );
      foundData.videoUrl = videoUrl;
      foundData.duration = duration;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
    }

    // Darsni yangilash va saqlash
    Object.assign(foundData, updateData);
    const data = await this.lessonRepository.update(foundData);

    return new ResData<Lesson>("Lesson updated successfully", 200, data);
  }

  /**
   * Darsni o'chirish funksiyasi.
   * Blokning umumiy davomiyligi va video sonini yangilaydi.
   * @param id Dars ID'si
   * @returns O'chirilgan dars haqida ma'lumot
   */
  async delete(id: ID): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);

    // Darsni o'chirish
    const data = await this.lessonRepository.delete(foundData);

    // Blokning davomiyligi va video sonini yangilash
    const foundBlock = await this.blockRepository.findById(foundData.block.id);
    foundBlock.duration =
      Number(foundBlock.duration) - Number(foundData.duration);
    foundBlock.countVideos = Number(foundBlock.countVideos) - 1;
    await this.blockRepository.update(foundBlock);

    return new ResData<Lesson>("Lesson deleted successfully", 200, data);
  }
}
