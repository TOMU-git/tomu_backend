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
import { QueryFailedError } from 'typeorm';
import { IBlockRepository } from "../block/interfaces/block.repository";
import { addVimeoEmbedUrl, addVimeoEmbedUrlToArray } from "src/common/utils/helper";

// `LessonService` klassi, ILessonService interfeysini implementatsiya qiladi va darslarni boshqarish uchun asosiy servis vazifasini bajaradi.
@Injectable()
export class LessonService implements ILessonService {
  constructor(
    @Inject("ILessonRepository") // ILessonRepository injektsiya qilinadi
    private readonly lessonRepository: ILessonRepository,

    @Inject("IBlockRepository") // IBlockRepository injektsiya qilinadi
    private readonly blockRepository: IBlockRepository,

    private readonly vimeoService: VimeoService, // Vimeo xizmatini yuklash uchun VimeoService injektsiya qilinadi
  ) { }

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

    // Video faylni Vimeo'ga yuklab, URL, davomiylik va video ID ni oladi
    const { videoUrl, duration, vimeoVideoId } = await this.vimeoService.uploadVideo(
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
      vimeoVideoId, // Vimeo video ID ni saqlash
      mimetype: file.mimetype,
      size: file.size,
      duration,
      grammarLink: dto.grammarLink || null, // grammarLink ni aniq qo'shish
    });

    // grammarVideoId ni avtomatik extract qilish
    if (newLesson.grammarLink) {
      const match = newLesson.grammarLink.match(/\/video\/(\d+)/);
      newLesson.grammarVideoId = match ? match[1] : null;
    } else {
      newLesson.grammarVideoId = null;
    }

    // Darsni saqlash
    const savedLesson = await this.lessonRepository.create(newLesson);

    // Response uchun faqat kerakli ma'lumotlarni qaytarish (relation ma'lumotlarisiz)
    const responseData = {
      id: savedLesson.id,
      title: savedLesson.title,
      videoUrl: savedLesson.videoUrl,
      vimeoVideoId: savedLesson.vimeoVideoId,
      order: savedLesson.order,
      mimetype: savedLesson.mimetype,
      size: savedLesson.size,
      duration: savedLesson.duration,
      grammarLink: savedLesson.grammarLink,
      grammarVideoId: savedLesson.grammarVideoId,
      createdAt: savedLesson.createdAt,
      lastUpdatedAt: savedLesson.lastUpdatedAt,
    };

    return new ResData<Lesson>(
      "Dars muvaffaqiyatli yaratildi",
      201,
      addVimeoEmbedUrl(responseData as Lesson),
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
      addVimeoEmbedUrlToArray(foundVideos),
    );
  }

  /**
   * Hamma darslarni olish funksiyasi.
   * @returns Barcha darslar ro'yxati
   */
  async findAll(): Promise<ResData<Array<Lesson>>> {
    const data = await this.lessonRepository.findAll();
    return new ResData<Array<Lesson>>("ok", 200, addVimeoEmbedUrlToArray(data));
  }

  /**d
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

    return new ResData<Lesson>("ok", 200, addVimeoEmbedUrl(foundData));
  }

  /**
   * Berilgan blok ID'siga tegishli barcha darslarni olish funksiyasi.
   * @param blockId Blok ID'si
   * @returns Blokga tegishli darslar
   */
  async getLessonsByBlockId(blockId: ID): Promise<ResData<Lesson[]>> {
    const lessons = await this.lessonRepository.findLessonsByBlockId(blockId);
    if (lessons.length === 0) {
      return new ResData<Lesson[]>(
        `No any videos in this blockId: ${blockId} `,
        200,
        lessons,
      );
    }
    return new ResData<Lesson[]>(
      "Lessons by blockId fetched successfully",
      200,
      addVimeoEmbedUrlToArray(lessons),
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
    const oldBlockId = foundData.block.id;
    const oldDuration = foundData.duration;

    // Agar blockId berilgan bo'lsa va u eski blockdan farq qilsa
    let isBlockChanged = false;
    if (dto.blockId && dto.blockId !== oldBlockId) {
      const newBlock = await this.blockRepository.findById(dto.blockId);
      foundData.block = newBlock;
      isBlockChanged = true;
    }

    // Faqat order o'zgartirilganida tekshirish
    if (dto.order && dto.order !== foundData.order) {
      const orderExist = await this.lessonRepository.findOneByOrder(
        dto.order,
        dto.blockId || oldBlockId,
      );
      if (orderExist) {
        throw new LessonOrderAlreadyExistException();
      }
    }

    // Yangi fayl bo'lsa, videoni yangilash
    let newDuration = oldDuration;
    if (file) {
      const { videoUrl, duration, vimeoVideoId } = await this.vimeoService.uploadVideo(
        file.buffer,
        dto.title || foundData.title,
        "Dars videosi",
      );
      foundData.videoUrl = videoUrl;
      foundData.vimeoVideoId = vimeoVideoId; // Vimeo video ID ni yangilash
      foundData.duration = duration;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
      newDuration = duration;
    }

    // Yangilanishlarni qo'llash
    if (dto.order !== undefined && dto.order !== null) {
      foundData.order = dto.order;
    }
    if (dto.title !== undefined && dto.title !== null && dto.title.trim() !== '') {
      foundData.title = dto.title;
    }
    if (dto.grammarLink !== undefined) {
      foundData.grammarLink = dto.grammarLink;
    }

    // grammarVideoId ni avtomatik extract qilish
    if (foundData.grammarLink) {
      const match = foundData.grammarLink.match(/\/video\/(\d+)/);
      foundData.grammarVideoId = match ? match[1] : null;
    } else {
      foundData.grammarVideoId = null;
    }

    // Darsni yangilash
    const data = await this.lessonRepository.update(foundData);

    // Agar block o'zgargan bo'lsa, eski va yangi blocklarning countVideos va duration ni yangilash
    if (isBlockChanged) {
      // Eski blockdan ayirish
      const oldBlock = await this.blockRepository.findById(oldBlockId);
      if (oldBlock) {
        oldBlock.countVideos = Number(oldBlock.countVideos) - 1;
        oldBlock.duration = Number(oldBlock.duration) - Number(oldDuration);
        await this.blockRepository.update(oldBlock);
      }

      // Yangi blockka qo'shish
      const newBlock = await this.blockRepository.findById(foundData.block.id);
      if (newBlock) {
        newBlock.countVideos = Number(newBlock.countVideos) + 1;
        newBlock.duration = Number(newBlock.duration) + Number(newDuration);
        await this.blockRepository.update(newBlock);
      }
    } else if (file) {
      // Agar faqat video o'zgargan bo'lsa (block o'zgarmagan), duration ni yangilash
      const block = await this.blockRepository.findById(oldBlockId);
      if (block) {
        block.duration = Number(block.duration) - Number(oldDuration) + Number(newDuration);
        await this.blockRepository.update(block);
      }
    }

    // Response uchun faqat kerakli ma'lumotlarni qaytarish (relation ma'lumotlarisiz)
    const responseData = {
      id: data.id,
      title: data.title,
      videoUrl: data.videoUrl,
      vimeoVideoId: data.vimeoVideoId,
      order: data.order,
      mimetype: data.mimetype,
      size: data.size,
      duration: data.duration,
      grammarLink: data.grammarLink,
      grammarVideoId: data.grammarVideoId,
      createdAt: data.createdAt,
      lastUpdatedAt: data.lastUpdatedAt,
    };

    return new ResData<Lesson>("Lesson updated successfully", 200, addVimeoEmbedUrl(responseData as Lesson));
  }


  /**
   * Darsni o'chirish funksiyasi.
   * Blokning umumiy davomiyligi va video sonini yangilaydi.
   * @param id Dars ID'si
   * @returns O'chirilgan dars haqida ma'lumot
   */

  async delete(id: ID): Promise<ResData<Lesson>> {
    const { data: foundData } = await this.findOneById(id);

    try {
      // Darsni o‘chirish
      const data = await this.lessonRepository.delete(foundData);

      // Blokning davomiyligi va video sonini yangilash
      const foundBlock = await this.blockRepository.findById(foundData.block.id);
      foundBlock.duration =
        Number(foundBlock.duration) - Number(foundData.duration);
      foundBlock.countVideos = Number(foundBlock.countVideos) - 1;
      await this.blockRepository.update(foundBlock);

      return new ResData<Lesson>("Lesson deleted successfully", 200, addVimeoEmbedUrl(data));
    } catch (error) {
      // Agar foreign key xatosi bo‘lsa — lesson_progress bilan bog‘liq
      if (
        error instanceof QueryFailedError &&
        error.driverError.code === '23503'
      ) {
        return new ResData<Lesson>(
          "Bu darsni o‘chirish mumkin emas, chunki foydalanuvchilar uni ko‘rgan.",
          409,
          null,
        );
      }

      // Boshqa xatolarni tashlaymiz
      throw error;
    }
  }

}
