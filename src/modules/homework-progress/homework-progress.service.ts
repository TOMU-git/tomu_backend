import { Injectable, Inject } from "@nestjs/common";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { IHomeworkProgressRepository } from "./interfaces/homework-progress.repository";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "./dto/create-homework-progress.dto";
import {
  HomeworkProgressAlreadyExistException,
  HomeworkProgressNotFoundException,
} from "./exception/homework-progress.exception";
import { IHomeworkRepository } from "../homework/interfaces/homework.repository";
import { IUserRepository } from "../user/interfaces/user.repository";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";
import { UserNotFound } from "../user/exception/user.exception";
import { HomeworkNotFoundException } from "../homework/exception/homework.exception";

@Injectable()
export class HomeworkProgressService implements IHomeworkProgressService {
  constructor(
    @Inject("IHomeworkProgressRepository")
    private readonly homeworkProgressRepository: IHomeworkProgressRepository,

    @Inject("IUserRepository") // UserRepository ni inject qilamiz
    private readonly userRepository: IUserRepository,

    @Inject("IHomeworkRepository") // HomeworkService ni inject qilamiz
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IBlockRepository") // BlockService ni inject qilamiz
    private readonly blockRepository: IBlockRepository,
  ) {}

  async create(
    dto: CreateHomeworkProgressDto,
  ): Promise<ResData<Partial<HomeworkProgress>>> {
    // console.log(
    //   "Creating homework progress with userId:",
    //   dto.userId,
    //   "and homeworkId:",
    //   dto.homeworkId,
    // );

    // User va homework mavjudligini tekshirish
    const foundUser = await this.userRepository.findOneById(dto.userId);
    if (!foundUser) {
      throw new UserNotFound();
    }
    const foundHomework = await this.homeworkRepository.findById(
      dto.homeworkId,
    );

    if (!foundHomework) {
      throw new HomeworkNotFoundException();
    }
    // Homework progressni yaratish
    let newHomeworkProgress = new HomeworkProgress();
    newHomeworkProgress.user = foundUser;
    newHomeworkProgress.homework = foundHomework;
    newHomeworkProgress = Object.assign(newHomeworkProgress, dto);
    const createdHomeworkProgress =
      await this.homeworkProgressRepository.create(newHomeworkProgress);

    // Faqat kerakli ma'lumotlarni olish
    const result = {
      id: createdHomeworkProgress.id,
      userId: foundUser.id,
      homeworkId: foundHomework.id,
    };

    return new ResData<Partial<HomeworkProgress>>(
      "Homework progress created successfully",
      201,
      result,
    );
  }

  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    const data = await this.homeworkProgressRepository.findAll();

    return new ResData<Array<HomeworkProgress>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<HomeworkProgress>> {
    const foundData = await this.homeworkProgressRepository.findById(id);
    if (!foundData) {
      throw new HomeworkProgressNotFoundException();
    }

    return new ResData<HomeworkProgress>("ok", 200, foundData);
  }

  async findByUserId(id: ID): Promise<ResData<Array<HomeworkProgress>>> {
    const foundData = await this.homeworkProgressRepository.findByUserId(id);
    if (!foundData) {
      throw new HomeworkProgressNotFoundException();
    }

    return new ResData<Array<HomeworkProgress>>("ok", 200, foundData);
  }

  async update(
    id: ID,
    dto: UpdateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>> {
    const foundData = await this.homeworkProgressRepository.findById(id);
    if (!foundData) {
      throw new HomeworkProgressNotFoundException();
    }
    foundData.countWatched = dto.countWatched;
    foundData.isWatched = dto.isWatched;

    const updatedData = await this.homeworkProgressRepository.update(foundData);
    return new ResData<HomeworkProgress>("ok", 200, updatedData);
  }

  async delete(id: ID): Promise<ResData<HomeworkProgress>> {
    const foundData = await this.homeworkProgressRepository.findById(id);
    if (!foundData) {
      throw new HomeworkProgressNotFoundException();
    }

    const data = await this.homeworkProgressRepository.delete(foundData);

    return new ResData<HomeworkProgress>("ok", 200, data);
  }

  async getVideos(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<Array<HomeworkProgress> | boolean>> {
    let data = null;
    const progressExist = await this.checkProgressExist(userId);
    if (progressExist) {
      data = true;
      return new ResData<Array<HomeworkProgress> | boolean>(
        "progress exist",
        200,
        data,
      );
    }
    // checkprogressExist - progress bor yo'qligini tekshirish ✅

    const generateProgress = await this.createInitialProgress(userId, blockId);
    return new ResData<Array<HomeworkProgress> | boolean>(
      "10 progress yaratilda",
      200,
      generateProgress,
    );
    // agar checkprogress false bo'lsa 10 progress create qilamiz ✅

    const checkVideosIsWatched = await this.checkVideos(userId)
  }

  async checkProgressExist(userId: ID): Promise<boolean> {
    let result = false;
    const progress = await this.homeworkProgressRepository.findByUserId(userId);
    if (progress.length > 0) {
      result = true;
    }

    return result; // Agar progress bo'lsa, true qaytaramiz, aks holda false
  }

  // Progress yozuvlarini yaratish
  async createInitialProgress(
    userId: ID,
    blockId: ID,
  ): Promise<Array<HomeworkProgress>> {
    const foundUser = await this.userRepository.findOneById(userId);
    if (!foundUser) {
      throw new UserNotFound();
    }

    const foundBlock = await this.blockRepository.findById(blockId);
    if (!foundBlock) {
      throw new BlockNotFoundException();
    }

    // console.log("foundBlock", foundBlock);
    const topTenVideos = foundBlock.homeworks
      .sort((a, b) => a.order - b.order) // order bo'yicha saralash
      .slice(0, 10) // faqat dastlabki 10 ta videoni tanlash
      .map((video) => video.id); // faqat id larni olish

    const homeworkProgresses: HomeworkProgress[] = [];

    for (const homeworkId of topTenVideos) {
      // Homeworkni tekshirish
      const foundHomework = await this.homeworkRepository.findById(homeworkId);
      if (!foundHomework) {
        continue; // Agar homework topilmasa, keyingi video uchun davom etadi
      }

      // Yangi HomeworkProgress obyektini yaratish
      let newHomeworkProgress = new HomeworkProgress();
      newHomeworkProgress.user = foundUser;
      newHomeworkProgress.homework = foundHomework;
      newHomeworkProgress.isWatched = true; // Progress yaratishda isWatched true
      newHomeworkProgress.countWatched = 1; // Odatda 1 martadan ko‘rilgan deb belgilanadi

      // Homework progressni bazaga qo'shish
      const createdHomeworkProgress =
        await this.homeworkProgressRepository.create(newHomeworkProgress);

      // Natijani homeworkProgresses massiviga qo'shish
      homeworkProgresses.push(createdHomeworkProgress);
    }

    // console.log(homeworkProgresses);

    return homeworkProgresses;
  }

  async checkVideos(userId: ID): Promise<boolean> {
    const foundData =
      await this.homeworkProgressRepository.findByUserId(userId);
    // `isWatched` true bo'lgan yozuvlarni filtrlash va ularning `homework.order` qiymatlarini olish
    const watchedOrders = foundData
      .filter((progress) => progress.isWatched && progress.homework !== null)
      .map((progress) => progress.homework.order);

    // Agar `watchedOrders` bo'sh bo'lmasa, eng katta `order` qiymatini olish
    const maxOrder =
      watchedOrders.length > 0 ? Math.max(...watchedOrders) : null;

    return;
  }
}
