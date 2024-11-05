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
    const foundHomework = await this.homeworkRepository.findById(
      dto.homeworkId,
    );

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

  async getVideos(
    userID: ID,
    blockId: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    return;
  }

  async checkProgressExist(userId: ID): Promise<boolean> {
    const progress =
      await this.homeworkProgressRepository.findOneByUserId(userId);
    return !!progress; // Agar progress bo'lsa, true qaytaramiz, aks holda false
  }

  // Progress yozuvlarini yaratish
  async createInitialProgress(
    userId: ID,
    blockId: ID,
  ): Promise<HomeworkProgress[]> {
    // Block ID orqali bog'langan videolarni olish
    const block = await this.blockRepository.findById(blockId);

    // Order qiymati 10 yoki undan kichik bo'lgan videolarni tanlash
    const videosToUse = block.homeworks
      .filter((video) => video.order <= 10)
      .map((video) => video.id); // Faqat video ID larini olish

    const progressEntries: HomeworkProgress[] = [];

    // Tanlangan videolar uchun progress yozuvlarini yaratish
    for (const videoId of videosToUse) {
      const newProgress = new HomeworkProgress();
      newProgress.user = { id: userId } as User; // Userni ID bilan bog'lash
      newProgress.homework = { id: videoId } as Homework; // Homeworkni video ID bilan bog'lash
      newProgress.isWatched = true; // Ko'rilgan deb belgilash
      newProgress.countWatched = 0; // Dastlab 0 dan boshlash

      progressEntries.push(newProgress);
    }

    // Barcha progress yozuvlarini bazaga saqlash
    return this.homeworkProgressRepository.save(progressEntries);
  }

  // async getRandomVideos(
  //   order: number,
  //   blockId: ID,
  //   userId: ID,
  // ): Promise<ResData<Array<HomeworkProgress>>> {
  //   const currentOrder = order - 5;

  //   // countWatched qiymati 0 dan katta va 5 dan kichik bo'lgan videolarni olish
  //   const checkedVideoList =
  //     await this.homeworkProgressRepository.getVideosWithWatchCountBetween0And5(
  //       currentOrder,
  //       blockId,
  //     );

  //   // console.log("checkedVideoList", checkedVideoList);

  //   // Tasodifiy aralashtirish uchun yordamchi funksiya
  //   function shuffleArray(array: HomeworkProgress[]): HomeworkProgress[] {
  //     for (let i = array.length - 1; i > 0; i--) {
  //       const j = Math.floor(Math.random() * (i + 1));
  //       [array[i], array[j]] = [array[j], array[i]];
  //     }
  //     return array;
  //   }

  //   // Tasodifiy aralashtirish va boricha yoki maksimal 15 tasini olish
  //   const shuffledVideos = shuffleArray(checkedVideoList).slice(
  //     0,
  //     Math.min(15, checkedVideoList.length),
  //   );

  //   // console.log("shuffledVideos", shuffledVideos);
  //   return new ResData<Array<HomeworkProgress>>(
  //     "Random videos fetched successfully",
  //     200,
  //     shuffledVideos,
  //   );
  // }

  // async getWatchedHomeworkProgressUpToOrder(
  //   order: ID,
  // ): Promise<ResData<boolean>> {
  //   const data =
  //     await this.homeworkProgressRepository.getWatchedHomeworkProgressUpToOrder(
  //       order,
  //     );

  //   // `isWatched` maydonini tekshirish
  //   const allWatched = data.every((item) => item.isWatched);
  //   // console.log(allWatched);

  //   return new ResData<boolean>("All videos watched", 200, allWatched);
  // }
}
