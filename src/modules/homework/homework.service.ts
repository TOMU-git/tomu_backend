import { Inject, Injectable } from "@nestjs/common";
import { IHomeworkService } from "./interfaces/homework.service";
import { IHomeworkRepository } from "./interfaces/homework.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { Homework } from "./entities/homework.entity";
import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import {
  HomeworkNotFoundException,
  HomeworkOrderAlreadyExistException,
} from "./exception/homework.exception";
import { VimeoService } from "../lesson/vimeo.service";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";
import { addVimeoEmbedUrl, addVimeoEmbedUrlToArray } from "src/common/utils/helper";

@Injectable()
export class HomeworkService implements IHomeworkService {
  constructor(
    @Inject("IHomeworkRepository")
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IBlockRepository")
    private readonly blockRepository: IBlockRepository,

    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) { }

  /**
   * Yangi Homework yaratadi.
   * Homework yaratishdan oldin block va order ID'larini tekshiradi.
   * Agar block yoki order mavjud bo'lmasa, xatolik chiqaradi.
   * @param createHomeworkDto Yangi Homework uchun ma'lumotlar
   * @param file Yuklangan video fayl
   * @returns Homework muvaffaqiyatli yaratilganligi haqida javob
   */
  async create(
    createHomeworkDto: CreateHomeworkDto,
    file: Express.Multer.File,
  ): Promise<ResData<Homework>> {
    // Block mavjudligini tekshiradi
    const block = await this.blockRepository.findById(
      createHomeworkDto.blockId,
    );
    if (!block) {
      throw new BlockNotFoundException();
    }

    // Berilgan order ID bilan Homework mavjudligini tekshiradi
    const orderExist = await this.homeworkRepository.findOneByOrder(
      createHomeworkDto.order,
      createHomeworkDto.blockId,
    );
    if (orderExist) {
      throw new HomeworkOrderAlreadyExistException();
    }

    // Video faylni yuklaydi va tegishli ma'lumotlarni saqlaydi
    const { videoUrl, duration, vimeoVideoId } = await this.vimeoService.uploadVideo(
      file.buffer,
      createHomeworkDto.title,
      "Dars videosi",
    );

    // Blockdagi davomiyligini yangilaydi (countVideos faqat lesson uchun)
    block.duration = Number(block.duration) + Number(duration);
    await this.blockRepository.update(block);

    // Homework ma'lumotlarini yaratadi va bazaga saqlaydi
    let newHomework = new Homework();
    newHomework.block = block;
    newHomework.videoUrl = videoUrl;
    newHomework.vimeoVideoId = vimeoVideoId;
    newHomework.mimetype = file.mimetype;
    newHomework.size = file.size;
    newHomework.duration = duration;
    newHomework = Object.assign(newHomework, createHomeworkDto);
    const newData = await this.homeworkRepository.create(newHomework);

    // Response uchun faqat kerakli ma'lumotlarni qaytarish (relation ma'lumotlarisiz)
    const responseData = {
      id: newData.id,
      title: newData.title,
      videoUrl: newData.videoUrl,
      vimeoVideoId: newData.vimeoVideoId,
      order: newData.order,
      mimetype: newData.mimetype,
      size: newData.size,
      duration: newData.duration,
      createdAt: newData.createdAt,
      lastUpdatedAt: newData.lastUpdatedAt,
    };

    return new ResData<Homework>("Homework created successfully", 201, addVimeoEmbedUrl(responseData as Homework));
  }

  /**
   * Hamma Homeworklarni oladi.
   * @returns Hamma Homeworklarning ro'yxati
   */
  async findAll(): Promise<ResData<Array<Homework>>> {
    const data = await this.homeworkRepository.findAll();

    return new ResData<Array<Homework>>("ok", 200, addVimeoEmbedUrlToArray(data));
  }

  /**
   * Homework-ni ID bo'yicha topadi.
   * Agar Homework topilmasa, xatolik chiqaradi.
   * @param id Homework ID'si
   * @returns Topilgan Homework haqida ma'lumot
   */
  async findOneById(id: ID): Promise<ResData<Homework>> {
    const foundData = await this.homeworkRepository.findById(id);
    if (!foundData) {
      throw new HomeworkNotFoundException();
    }

    return new ResData<Homework>("ok", 200, addVimeoEmbedUrl(foundData));
  }

  /**
   * Homework-ni yangilaydi.
   * Yangilanishdan oldin Homework, block va order mavjudligini tekshiradi.
   * @param id Homework ID'si
   * @param updateHomeworkDto Yangilangan Homework ma'lumotlari
   * @param file Yangi video fayl (mavjud bo'lsa)
   * @returns Yangilangan Homework haqida ma'lumot
   */
  async update(
    id: ID,
    updateHomeworkDto: UpdateHomeworkDto,
    file: Express.Multer.File,
  ): Promise<ResData<Homework>> {
    const { data: foundData } = await this.findOneById(id);

    // Yangi order bo'yicha Homework mavjudligini tekshiradi
    const orderExist = await this.homeworkRepository.findOneByOrder(
      updateHomeworkDto.order,
      updateHomeworkDto.blockId,
    );
    if (orderExist && foundData.order !== updateHomeworkDto.order) {
      throw new HomeworkOrderAlreadyExistException();
    }

    // Block mavjudligini tekshiradi
    const block = await this.blockRepository.findById(
      updateHomeworkDto.blockId,
    );
    if (!block) {
      throw new BlockNotFoundException();
    }

    // Homework ma'lumotlarini yangilaydi
    foundData.order = updateHomeworkDto.order;
    foundData.title = updateHomeworkDto.title;
    foundData.block = block;

    // Video o'zgarganda block duration ni yangilash logic
    if (file) {
      const { videoUrl, duration, vimeoVideoId } = await this.vimeoService.uploadVideo(
        file.buffer,
        updateHomeworkDto.title,
        "Dars videosi",
      );

      // Block duration dagi farqni hisoblash va yangilash
      block.duration =
        Number(block.duration) - Number(foundData.duration) + Number(duration);
      await this.blockRepository.update(block);

      foundData.videoUrl = videoUrl;
      foundData.vimeoVideoId = vimeoVideoId;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
      foundData.duration = duration;
    }

    const data = await this.homeworkRepository.update(foundData);

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
      createdAt: data.createdAt,
      lastUpdatedAt: data.lastUpdatedAt,
    };

    return new ResData<Homework>(
      "Homework updated successfully",
      200,
      addVimeoEmbedUrl(responseData as Homework),
    );
  }

  /**
 * Berilgan blok ID'siga tegishli barcha darslarni olish funksiyasi.
 * @param blockId Blok ID'si
 * @returns Blokga tegishli darslar
 */
  async getHomeworksByBlockId(blockId: ID): Promise<ResData<Homework[]>> {
    const homeworks = await this.homeworkRepository.findHomeworksByBlockId(blockId);
    if (homeworks.length === 0) {
      return new ResData<Homework[]>(
        `No any videos in this blockId: ${blockId} `,
        200,
        homeworks,
      );
    }
    return new ResData<Homework[]>(
      "Homeworks by blockId fetched successfully",
      200,
      addVimeoEmbedUrlToArray(homeworks),
    );
  }

  /**
   * Keyingi 5 ta videoni oladi.
   * @param order Hozirgi Homework order
   * @param blockId Block ID'si
   * @returns Keyingi 5 ta Homework videolari
   */
  async getNextFiveVideos(
    order: ID,
    blockId: ID,
  ): Promise<ResData<Array<Homework>>> {
    const data = await this.homeworkRepository.getNextFiveVideos(
      order,
      blockId,
    );

    return new ResData<Array<Homework>>(
      "Videos fetched successfully",
      200,
      addVimeoEmbedUrlToArray(data),
    );
  }

  /**
   * Homework-ni o'chiradi.
   * ID bo'yicha Homework-ni topadi va o'chiradi.
   * @param id Homework ID'si
   * @returns O'chirilgan Homework haqida ma'lumot
   */
  async delete(id: ID): Promise<ResData<Homework>> {
    const { data: foundData } = await this.findOneById(id);

    // Block duration dan dars vaqtini ayirish
    const block = await this.blockRepository.findById(foundData.block.id);
    if (block) {
      block.duration = Number(block.duration) - Number(foundData.duration);
      await this.blockRepository.update(block);
    }

    const data = await this.homeworkRepository.delete(foundData);

    return new ResData<Homework>(
      "Homework deleted successfully",
      200,
      addVimeoEmbedUrl(data),
    );
  }
}
