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
    blockOrder: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    const existingProgress =
      await this.homeworkProgressRepository.findByOrderAndUserId(
        userId,
        blockOrder,
      );

    // Faqat isWatched: true bo'lgan progresslarni sanash
    const watchedProgressCount = existingProgress.filter(
      (progress) => progress.isWatched === true,
    ).length;

    // Faqat isWatched: false bo'lgan progresslarni sanash
    const notWatchedProgressCount = existingProgress.filter(
      (progress) => progress.isWatched === false,
    ).length;

    return;
  }

  async generateTenProgress(
    userId: ID,
    blockId: ID,
    blockOrder: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    // Blokni olish
    const block = await this.blockRepository.findById(blockId);
    if (!block) {
      throw new Error("Block not found");
    }

    const lastHomeworkOrder =
      await this.homeworkProgressRepository.findHighestLessonOrderByUserAndBlock(
        blockOrder,
        userId,
      );

    // lastHomeworkOrder dan keyingi 10 darsni olish
    const homeworks =
      await this.homeworkRepository.findNextTenHomeworksAfterOrder(
        lastHomeworkOrder || 0, // Agar progress yo'q bo'lsa, 0 dan boshlash
        blockId,
      );

    if (homeworks.length < 1) {
      throw new Error("No more homeworks available in this block");
    }

    if (homeworks.length < 1) {
      throw new Error("No more homeworks available in this block");
    }

    const newProgressList: HomeworkProgress[] = [];

    for (let i = 0; i < homeworks.length; i++) {
      const homework = homeworks[i];

      // User va homework kombinatsiyasi uchun progress mavjudligini tekshirish
      const existingProgress =
        await this.homeworkProgressRepository.findOneByUserAndHomework(
          userId,
          homework.id,
        );
      if (existingProgress) {
        throw new HomeworkProgressAlreadyExistException();
      }

      // Yangi HomeworkProgress obyektini yaratish
      const newHomeworkProgress = new HomeworkProgress();
      newHomeworkProgress.user = { id: userId } as any; // userni id bilan bog'lash
      newHomeworkProgress.userId = userId;
      newHomeworkProgress.homework = homework;
      newHomeworkProgress.blockOrder = block.order;
      newHomeworkProgress.homeworkOrder = homework.order;

      // Birinchi dars uchun `isWatched` true, qolganlari uchun false
      newHomeworkProgress.isWatched = i === 0;

      // Yangi progressni bazaga saqlash
      const savedProgress =
        await this.homeworkProgressRepository.create(newHomeworkProgress);
      newProgressList.push(savedProgress);
    }

    // Yangi progresslar yaratib bo'lgach, barcha progresslarni olish
    const allProgresses =
      await this.homeworkProgressRepository.findByOrderAndUserId(
        block.order,
        userId,
      );

    return;
  }
}
