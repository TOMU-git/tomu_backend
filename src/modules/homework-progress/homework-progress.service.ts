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
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager'; // ! Don't forget this import
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

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
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
    blockOrder: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    console.log("service")
    const existingProgress =
    await this.homeworkProgressRepository.findByOrderAndUserId(
      userId,
      blockOrder,
    );
    console.log("existingProgress", existingProgress);
    
    const key = `progress:${userId}:${blockOrder}`;
    
    if (existingProgress.length < 15 && existingProgress.length > 1) {
      return new ResData<Array<HomeworkProgress>>("ok", 200, existingProgress);
    }
    
    const watchedProgressCount = existingProgress.filter(
      (progress) => progress.isWatched === true,
    ).length;
    const notWatchedProgressCount = existingProgress.filter(
      (progress) => progress.isWatched === false,
    ).length;
    
    if (
      (watchedProgressCount % 5 === 0 && notWatchedProgressCount === 0) ||
      existingProgress.length === 0
    ) {
      console.log("if ni ichi")
      const fiveProgress = await this.generateFiveProgress(
        userId,
        blockId,
        blockOrder,
      );
      console.log("fiveProgress", fiveProgress);

      const randomVideos = await this.getRandomVideos(blockOrder);
      const progressList = [...fiveProgress, ...randomVideos].slice(0, 20);

      await this.cacheManager.set(key, progressList);
      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        progressList,
      );
    }

    const cachedProgress = (await this.cacheManager.get(key)) as
      | HomeworkProgress[]
      | null;

    return new ResData<Array<HomeworkProgress>>(
      "ok",
      200,
      cachedProgress || existingProgress,
    );
  }

  // Random video olish funksiyasi
  private async getRandomVideos(
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>> {
    const randomVideos =
      await this.homeworkProgressRepository.getVideosWithWatchCountBetween0And5(
        blockOrder,
      );
    // 15 tasini tasodifiy tanlash
    return this.shuffleArray(randomVideos).slice(0, 15);
  }

  private shuffleArray(
    array: Array<HomeworkProgress>,
  ): Array<HomeworkProgress> {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async generateFiveProgress(
    userId: ID,
    blockId: ID,
    blockOrder: ID,
  ): Promise<Array<HomeworkProgress>> {
    const block = await this.blockRepository.findById(blockId);
    console.log("blockOrder", block.order)
    if (!block) throw new BlockNotFoundException();

    const lastHomeworkOrder =
      await this.homeworkProgressRepository.findHighestHomeworkOrderByUserAndBlock(
        blockOrder,
        userId,
      );

    const homeworks =
      await this.homeworkRepository.findNextFiveHomeworksAfterOrder(
        lastHomeworkOrder || 0,
        blockId,
      );

    if (homeworks.length < 1)
      throw new Error("No more homeworks available in this block");

    const newProgressList: HomeworkProgress[] = [];
    for (const [i, homework] of homeworks.entries()) {
      const existingProgress =
        await this.homeworkProgressRepository.findOneByUserAndHomework(
          userId,
          homework.id,
        );
      if (existingProgress) throw new HomeworkProgressAlreadyExistException();

      const newHomeworkProgress = new HomeworkProgress();
      newHomeworkProgress.userId = userId;
      newHomeworkProgress.homework = homework;
      newHomeworkProgress.blockOrder = block.order;
      newHomeworkProgress.homeworkOrder = homework.order;
      newHomeworkProgress.isWatched = i === 0;

      const savedProgress =
        await this.homeworkProgressRepository.create(newHomeworkProgress);
      newProgressList.push(savedProgress);
    }
    return newProgressList;
  }
}
