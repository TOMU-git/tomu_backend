import { Inject, Injectable } from "@nestjs/common";
import { IHomeworkRepository } from "./interfaces/homework.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IHomeworkService } from "./interfaces/homework.service";
import {
  HomeworkNotFoundException,
  HomeworkOrderAlreadyExistException,
} from "./exception/homework.exception";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { Homework } from "./entities/homework.entity";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";
import { VimeoService } from "../lesson/vimeo.service";

@Injectable()
export class HomeworkService implements IHomeworkService {
  constructor(
    @Inject("IHomeworkRepository")
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IBlockRepository")
    private readonly blockRepository: IBlockRepository,

    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

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
    const { videoUrl, duration } = await this.vimeoService.uploadVideo(
      file.buffer,
      createHomeworkDto.description,
      "Dars videosi",
    );

    // Blockdagi video soni va davomiyligini yangilaydi
    block.duration = Number(block.duration) + Number(duration);
    block.countVideos = Number(block.countVideos) + 1;
    await this.blockRepository.update(block);

    // Homework ma'lumotlarini yaratadi va bazaga saqlaydi
    let newHomework = new Homework();
    newHomework.block = block;
    newHomework.videoUrl = videoUrl;
    newHomework.mimetype = file.mimetype;
    newHomework.size = file.size;
    newHomework.duration = duration;
    newHomework = Object.assign(newHomework, createHomeworkDto);
    const newData = await this.homeworkRepository.create(newHomework);

    return new ResData<Homework>("Homework created successfully", 201, newData);
  }

  /**
   * Hamma Homeworklarni oladi.
   * @returns Hamma Homeworklarning ro'yxati
   */
  async findAll(): Promise<ResData<Array<Homework>>> {
    const data = await this.homeworkRepository.findAll();

    return new ResData<Array<Homework>>("ok", 200, data);
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

    return new ResData<Homework>("ok", 200, foundData);
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
    if (orderExist) {
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
    foundData.description = updateHomeworkDto.description;
    foundData.block = block;

    // Yangi video fayl mavjud bo'lsa, yuklaydi
    if (file) {
      const { videoUrl, duration } = await this.vimeoService.uploadVideo(
        file.buffer,
        updateHomeworkDto.description,
        "Dars videosi",
      );

      foundData.videoUrl = videoUrl;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
      foundData.duration = duration;
    }

    const updatedData = Object.assign(foundData, updateHomeworkDto);
    return new ResData<Homework>(
      "Homework updated successfully",
      200,
      updatedData,
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
      data,
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
    const data = await this.homeworkRepository.delete(foundData);

    return new ResData<Homework>("Homework deleted successfully", 200, data);
  }
}
