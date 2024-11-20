import { Injectable, Inject } from "@nestjs/common";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { IHomeworkProgressRepository } from "./interfaces/homework-progress.repository";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import {
  HomeworkProgressAlreadyExistException,
  HomeworkProgressNotFoundException,
  NotFoundNextProgress,
} from "./exception/homework-progress.exception";
import { IHomeworkRepository } from "../homework/interfaces/homework.repository";
import { IUserRepository } from "../user/interfaces/user.repository";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";
import { UserNotFound } from "../user/exception/user.exception";
import { HomeworkNotFoundException } from "../homework/exception/homework.exception";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager"; // ! Don't forget this import
import { ILessonProgressRepository } from "../lesson-progress/interfaces/lesson-progress.repository";
import { IUserHomeworkProgressRepository } from "../user-homework-progress/interfaces/user-homework-progress.repository";
@Injectable()
export class HomeworkProgressService implements IHomeworkProgressService {
  constructor(
    @Inject("IHomeworkProgressRepository")
    private readonly homeworkProgressRepository: IHomeworkProgressRepository,

    @Inject("IUserRepository") // UserRepository ni inject qilamiz
    private readonly userRepository: IUserRepository,

    @Inject("IHomeworkRepository") // HomeworkService ni inject qilamiz
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IUserHomeworkProgressRepository") // HomeworkService ni inject qilamiz
    private readonly userHomeworkProgressRepository: IUserHomeworkProgressRepository,

    @Inject("ILessonProgressRepository") // LessonProgressService ni inject qilamiz
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject("IBlockRepository") // BlockService ni inject qilamiz
    private readonly blockRepository: IBlockRepository,

    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Barcha Homework progresslarini olish.
   * @returns Barcha Homework progresslari
   */
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    // Barcha homework progresslarni olish
    const data = await this.homeworkProgressRepository.findAll();

    // Homework progresslar muvaffaqiyatli topildi, natija qaytariladi
    return new ResData<Array<HomeworkProgress>>("ok", 200, data);
  }

  /**
   * ID bo'yicha Homework progressni topish.
   * @param id - Homework progress ID
   * @returns Ma'lum bir Homework progressi
   */
  async findOneById(id: ID): Promise<ResData<HomeworkProgress>> {
    // Berilgan ID bo'yicha homework progressni qidirish
    const foundData = await this.homeworkProgressRepository.findById(id);
    if (!foundData) {
      // Agar homework progress topilmasa, xato qaytariladi
      throw new HomeworkProgressNotFoundException();
    }

    // Homework progress muvaffaqiyatli topildi, natija qaytariladi
    return new ResData<HomeworkProgress>("ok", 200, foundData);
  }

  /**
   * Foydalanuvchi ID bo'yicha Homework progresslarini olish.
   * @param id - Foydalanuvchi ID
   * @returns Foydalanuvchining barcha Homework progresslari
   */
  async findByUserId(id: ID): Promise<ResData<Array<HomeworkProgress>>> {
    // Berilgan user ID bo'yicha homework progresslarni qidirish
    const foundData = await this.homeworkProgressRepository.findByUserId(id);
    if (!foundData) {
      // Agar homework progresslar topilmasa, xato qaytariladi
      throw new HomeworkProgressNotFoundException();
    }

    // Foydalanuvchining homework progresslari muvaffaqiyatli topildi, natija qaytariladi
    return new ResData<Array<HomeworkProgress>>("ok", 200, foundData);
  }

  /**
   * Homework progressini yangilash.
   * Redisdagi ma'lumotni ham update qilish
   * @param id - Yangilanishi kerak bo'lgan Homework progress ID
   * @param dto - Yangilanish uchun kerakli ma'lumotlar
   * @returns Yangilangan Homework progress
   */
  async update(
    dto: UpdateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>> {
    console.log("dto", dto);
    // Berilgan ID bo'yicha homework progressni qidirish
    const foundData = await this.homeworkProgressRepository.getHomeworkProgress(
      dto.homeworkOrder,
      dto.userId,
      dto.blockOrder,
      dto.courseId,
    );

    // keyingi homeworkni orderi
    const nextHomeworkOrder = Number(dto.homeworkOrder) + 1;
    console.log("nextHomeworkOrder", nextHomeworkOrder);

    // berilgan homeworkOrder userId va blockOrder bo'yicha progressni topish
    const nextProgress =
      await this.homeworkProgressRepository.getHomeworkProgress(
        nextHomeworkOrder,
        dto.userId,
        dto.blockOrder,
        dto.courseId,
      );
    // console.log("nextProgress", nextProgress);


    const checkOrder =
      Number(nextProgress.homeworkOrder) - Number(foundData.homeworkOrder);
    // console.log("checkOrder", checkOrder);

    const nextTemprorayProgress =
      await this.userHomeworkProgressRepository.findNextHomeworkProgress(
        dto.homeworkOrder,
        dto.userId,
        dto.blockOrder,
      );
    const nextTemporaryProgressOrder = Number(nextProgress.homeworkOrder);
    console.log("nextTemporaryProgressOrder:", nextTemporaryProgressOrder);

    // console.log(
    //   "before update keyingi temproray progress data",
    //   nextTemprorayProgress,
    // );
    if (nextTemprorayProgress) {
      await this.userHomeworkProgressRepository.markHomeworkAsWatched(
        nextTemporaryProgressOrder,
        dto.userId,
        dto.blockId,
      );

      const exitsNextProgress =
        await this.homeworkProgressRepository.getHomeworkProgress(
          nextTemporaryProgressOrder,
          dto.userId,
          dto.blockOrder,
          dto.courseId,
        );
      const order = Number(exitsNextProgress.homeworkOrder);
      // console.log("order,", order)
      // console.log("exitsNextProgress Bomi if (nextTemprorayProgress) ichida", exitsNextProgress)
      console.log("exitsNextProgress:", exitsNextProgress);
      if (exitsNextProgress) {
        // console.log("ishladi (nextTemprorayProgress) ichida")

        const d = await this.homeworkProgressRepository.markHomeworkAsWatched(
          order,
          dto.userId,
          dto.blockId,
        );
        console.log(
          "Params for markHomeworkAsWatched:",
          nextTemporaryProgressOrder,
          dto.userId,
          dto.blockId,
        );

        console.log("markHomeworkAsWatched", d),
          (foundData.countWatched = Number(foundData.countWatched) + 1);
        await this.homeworkProgressRepository.update(foundData);
      }

      const afterNextProgress =
        await this.homeworkProgressRepository.getHomeworkProgress(
          nextTemporaryProgressOrder,
          dto.userId,
          dto.blockOrder,
          dto.courseId,
        );

      console.log("after update process", afterNextProgress);

      const nextTemprorayProgress =
        await this.userHomeworkProgressRepository.findNextHomeworkProgress(
          dto.homeworkOrder,
          dto.userId,
          dto.blockOrder,
        );

      // console.log(
      //   "after update",
      //   nextTemprorayProgress,
      //   "////////////////////////",
      // );

      const data = await this.homeworkProgressRepository.getHomeworkProgress(
        nextTemporaryProgressOrder,
        dto.userId,
        dto.blockOrder,
        dto.courseId,
      );
      // Yangilangan homework progress qaytariladi
      return new ResData<HomeworkProgress>(
        "OK, next order information below from the progressDatabase",
        200,
        data,
      );
    }

    console.log("errorrrrrrrrrrrrrrrrrrrrrr");

    // Progressni yangilash

    if (nextProgress && checkOrder <= 1 && !nextTemprorayProgress) {
      // Keyingi progressni `isWatched` qilib yangilash
      console.log("progressni update qilish");
      await this.homeworkProgressRepository.markHomeworkAsWatched(
        nextHomeworkOrder,
        dto.userId,
        dto.blockId,
      );
      foundData.countWatched = Number(foundData.countWatched) + 1;
      await this.homeworkProgressRepository.update(foundData);
    }
    // Yangilangan progressni saqlash
    // console.log("updatedData", updatedData);

    const data = await this.homeworkProgressRepository.getHomeworkProgress(
      nextHomeworkOrder,
      dto.userId,
      dto.blockOrder,
      dto.courseId,
    );
    // Yangilangan homework progress qaytariladi
    return new ResData<HomeworkProgress>(
      "OK, next order information below from the progressDatabase",
      200,
      data,
    );
  }

  /**
   * Homework progressini o'chirish.
   * @param id - O'chirilishi kerak bo'lgan Homework progress ID
   * @returns O'chirilgan Homework progress
   */
  async delete(id: ID): Promise<ResData<HomeworkProgress>> {
    // Berilgan ID bo'yicha homework progressni qidirish
    const foundData = await this.homeworkProgressRepository.findById(id);
    if (!foundData) {
      // Agar homework progress topilmasa, xato qaytariladi
      throw new HomeworkProgressNotFoundException();
    }

    // Progressni o'chirisheyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiaWF0IjoxNzMyMDc5ODMwLCJleHAiOjE3MzIxNjYyMzB9.GwdxzJkmzzWew-mX6036emghr_PNO5AJhhBsEmKS0yE
    const data = await this.homeworkProgressRepository.delete(foundData);

    // O'chirilgan homework progress qaytariladi
    return new ResData<HomeworkProgress>("ok", 200, data);
  }

  /**
   * Foydalanuvchi uchun videos ro'yxatini olish va cache'dan tekshirish.
   * @param userId - Foydalanuvchi ID
   * @param blockId - Block ID
   * @returns Video ro'yxati yoki cached progress
   */
  async getVideos(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<Array<Partial<HomeworkProgress>>>> {
    const foundBlock = await this.blockRepository.findById(blockId);
    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);
    const blockOrder = foundBlock.order;
    // Foydalanuvchining progressini order bo'yicha olish
    const existingProgress =
      await this.homeworkProgressRepository.findByBlocIdAndUserId(
        blockId,
        userId,
      );
    console.log("existingProgress1____length", existingProgress.length);

    if (existingProgress.length === 0) {
      await this.generateFiveProgress(userId, blockId);

      const existingProgress =
        await this.homeworkProgressRepository.findByBlocIdAndUserId(
          blockId,
          userId,
        );

      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        existingProgress,
      );
    }

    // Ko'rilgan homeworklar soni
    const watchedProgressCount = existingProgress.filter(
      (progress) => progress.isWatched === true,
    ).length;
    console.log("watchedProgressCount", watchedProgressCount);

    // Ko'rilmagan homeworklar soni
    const notWatchedProgressCount = existingProgress.filter(
      (progress) => progress.isWatched === false,
    ).length;
    console.log("notWatchedProgressCount", notWatchedProgressCount);

    // Barcha homework progressi ko'rilganligini tekshirish
    const isWatchedAllHomework =
      await this.homeworkProgressRepository.areAllWatchedByOrderAndUserId(
        blockOrder,
        userId,
        courseId,
      );
    console.log("isWatchedAllHomework", isWatchedAllHomework);

    // So'nggi ko'rilgan homeworkni olish
    let lastWatchedHomeworkOrder =
      await this.homeworkProgressRepository.findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
        userId,
        blockId,
      );
    if (lastWatchedHomeworkOrder === null) {
      lastWatchedHomeworkOrder = 0;
    }
    console.log("lastWatchedHomeworkOrder", lastWatchedHomeworkOrder);

    // berilgan ordergacha bo'lgan lessonlarni tekshirish
    const isWatchedAllLesson =
      await this.lessonProgressRepository.isAllLessonWatched(
        blockOrder,
        lastWatchedHomeworkOrder,
        userId,
        courseId,
      );
    console.log("isWatchedAllLesson", isWatchedAllLesson);

    // Agar mavjud progress 5 dan kam yoki teng bo'lsa, lekin 1 dan katta bo'lsa, cache'dan olish
    if (existingProgress.length < 5 && existingProgress.length > 1) {
      console.log(
        " // Agar mavjud progress 5 dan kam yoki teng bo'lsa, lekin 1 dan katta bo'lsa, cache'dan olish",
      );
      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        existingProgress,
      );
    }

    // // agar hamma ochiq lesson larni ko'rmagan bo'lsa error message bilan oldingi progresslarni jo'natish
    if (
      watchedProgressCount % 5 === 0 &&
      notWatchedProgressCount === 0 &&
      isWatchedAllHomework &&
      !isWatchedAllLesson
    ) {
      console.log(
        " // agar hamma ochiq lesson larni ko'rmagan bo'lsa error message bilan oldingi progresslarni jo'natish",
      );
      const temporaryProgress =
        await this.userHomeworkProgressRepository.findByBlockOrderAndUserId(
          blockId,
          userId,
        );
      console.log("temporaryProgress", temporaryProgress);

      if (temporaryProgress.length > 1) {
        return new ResData<Array<Partial<HomeworkProgress>>>(
          "Keyingi videolarni ko'rish uchun oldin hamma dars videolarini ko'rishingiz kerak",
          200,
          temporaryProgress,
        );
      }

      return new ResData<Array<Partial<HomeworkProgress>>>(
        "You must have seen all the lessons before ",
        200,
        existingProgress,
      );
    }

    // agar hamma ochiq homework larni ko'rmagan bo'lsa error message bilan oldingi progresslarni jo'natish
    if (
      (watchedProgressCount % 5 === 0 &&
        notWatchedProgressCount === 0 &&
        !isWatchedAllHomework) ||
      existingProgress.length === 0
    ) {
      console.log(
        " // agar hamma ochiq homework larni ko'rmagan bo'lsa error message bilan oldingi progresslarni jo'natish",
      );
      const temporaryProgress =
        await this.userHomeworkProgressRepository.findByBlockOrderAndUserId(
          blockId,
          userId,
        );

      return new ResData<Array<Partial<HomeworkProgress>>>(
        "DATA from temproraryProgress",
        200,
        temporaryProgress,
      );
    }

    // agar ochiq homework va ochiq lesson larni hammasini ko'rgan bo'lsa progress yaratish
    if (
      watchedProgressCount % 5 === 0 &&
      notWatchedProgressCount === 0 &&
      isWatchedAllHomework &&
      isWatchedAllLesson
    ) {
      // Agar barcha shartlar to'g'ri bo'lsa, yangi 5ta progress yaratish
      console.log(
        " // agar ochiq homework va ochiq lesson larni hammasini ko'rgan bo'lsa progress yaratish",
      );
      await this.generateFiveProgress(userId, blockId);

      const existingProgress =
        await this.homeworkProgressRepository.findByBlocIdAndUserId(
          blockId,
          userId,
        );

      if (existingProgress.length < 20) {
        return new ResData<Array<HomeworkProgress>>(
          "Homework fetched successfully",
          200,
          existingProgress,
        );
      }

      if (existingProgress.length >= 20) {
        // Eng kichik homeworkOrder qiymatiga ega bo'lgan ma'lumotni topish va yangilash
        const lastFiveProgress =
          await this.homeworkProgressRepository.findTopFiveByBlockIdAndUserId(
            blockId,
            userId,
          );
        console.log("lastFiveProgress", lastFiveProgress.length);
        const randomVideos = await this.getRandomVideos(blockOrder, courseId);
        let progressList = [...lastFiveProgress, ...randomVideos];

        // Random qilingan ma'lumotni bazadan olish
        const isExistTemporaryProgress =
          await this.userHomeworkProgressRepository.findByBlockOrderAndUserId(
            blockId,
            userId,
          );
        if (isExistTemporaryProgress) {
          await this.userHomeworkProgressRepository.deleteAll(userId, blockId);
        }

        // randomVideos massivini homeworkOrder qiymatiga ko'ra tartiblash
        const sortedRandomVideos = randomVideos.sort(
          (a, b) => Number(a.homeworkOrder) - Number(b.homeworkOrder), // Number() bilan number turiga o'tkazish
        );

        for (let i = 0; i < sortedRandomVideos.length; i++) {
          const video = sortedRandomVideos[i];

          // Agar eng kichik homeworkOrder bo'lsa, isWatched ni true qilamiz, aks holda false qilamiz
          video.isWatched = i === 0 ? true : false;

          // Database yangilash
          await this.homeworkProgressRepository.update(video);
        }

        await this.userHomeworkProgressRepository.bulkCreate(progressList);

        const data =
          await this.userHomeworkProgressRepository.findByBlockOrderAndUserId(
            blockId,
            userId,
          );

        return new ResData<Array<Partial<HomeworkProgress>>>(
          "Homework fetched successfully DATA from temproraryProgress",
          200,
          data,
        );
      }
    }

    // Random qilingan ma'lumotlarni olish
    const temporaryProgress =
      await this.userHomeworkProgressRepository.findByBlockOrderAndUserId(
        blockId,
        userId,
      );

    if (temporaryProgress.length === 0) {
      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        existingProgress,
      );
    }
    return new ResData<Array<Partial<HomeworkProgress>>>(
      "Homework fetched successfully DATA from temprorayProgress",
      200,
      temporaryProgress,
    );
  }

  /**
   * Tasodifiy videolarni olish.
   * @param blockOrder - Block tartibi
   * @returns Tasodifiy videolar ro'yxati
   */
  private async getRandomVideos(
    blockOrder: ID,
    courseId: ID,
  ): Promise<Array<HomeworkProgress>> {
    const randomVideos =
      await this.homeworkProgressRepository.getVideosWithWatchCountBetween0And5(
        blockOrder,
        courseId,
      );
    // 15 tasini tasodifiy tanlash
    return this.shuffleArray(randomVideos).slice(0, 15);
  }

  /**
   * Massivni tasodifiy tartibda aralashtirish.
   * @param array - Aralashtirilishi kerak bo'lgan massiv
   * @returns Tasodifiy tartibdagi massiv
   */
  private shuffleArray(
    array: Array<HomeworkProgress>,
  ): Array<HomeworkProgress> {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * Foydalanuvchi uchun 5ta yangi homework progressini yaratish.
   * @param userId - Foydalanuvchi ID
   * @param blockId - Block ID
   * @param blockOrder - Block tartibi
   * @returns Yangi homework progress ro'yxati
   */
  async generateFiveProgress(
    userId: ID,
    blockId: ID,
  ): Promise<Array<HomeworkProgress>> {
    const block = await this.blockRepository.findById(blockId);
    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);
    if (!block) throw new BlockNotFoundException();

    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new UserNotFound();
    }

    // Mavjud progresslarni blok va foydalanuvchi bo‘yicha tekshirish
    const existingProgress =
      await this.homeworkProgressRepository.findByBlocIdAndUserId(
        blockId,
        userId,
      );

    // So'nggi homework orderini olish
    let lastHomeworkOrder = 0;
    if (existingProgress.length > 0) {
      lastHomeworkOrder =
        await this.homeworkProgressRepository.findHighestHomeworkOrderByUserAndBlock(
          blockId,
          userId,
        );
    }

    // Keyingi 5ta homeworkni olish
    const homeworks =
      await this.homeworkRepository.findNextFiveHomeworksAfterOrder(
        lastHomeworkOrder || 0,
        blockId,
      );

    console.log("homeworks__________________", homeworks);

    if (homeworks.length < 1)
      throw new Error("No more homeworks available in this block");

    // Yangi progresslarni yaratish
    const newProgressList: HomeworkProgress[] = [];
    for (const [i, homework] of homeworks.entries()) {
      const progressExists =
        await this.homeworkProgressRepository.findOneByUserAndHomework(
          userId,
          homework.id,
        );
      if (progressExists) throw new HomeworkProgressAlreadyExistException();

      const newHomeworkProgress = new HomeworkProgress();
      newHomeworkProgress.user = user;
      newHomeworkProgress.userId = userId;
      newHomeworkProgress.homework = homework;
      newHomeworkProgress.blockId = blockId;
      newHomeworkProgress.courseId = courseId;
      newHomeworkProgress.blockOrder = block.order;
      newHomeworkProgress.homeworkOrder = homework.order;

      // isWatched faqat mavjud progress bo‘lmaganda birinchi element uchun true bo‘ladi
      newHomeworkProgress.isWatched = existingProgress.length === 0 && i === 0;

      // Yangi progressni saqlash
      const savedProgress =
        await this.homeworkProgressRepository.create(newHomeworkProgress);
      newProgressList.push(savedProgress);
    }

    return newProgressList;
  }
}
