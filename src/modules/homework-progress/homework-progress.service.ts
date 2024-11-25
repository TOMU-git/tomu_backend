import { Injectable, Inject } from "@nestjs/common";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { IHomeworkProgressRepository } from "./interfaces/homework-progress.repository";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import {
  HomeworkProgressAlreadyExistException,
  HomeworkProgressNotFoundException,
  LessonNotWatchedException,
  NotFoundNextProgressException,
} from "./exception/homework-progress.exception";
import { IHomeworkRepository } from "../homework/interfaces/homework.repository";
import { IUserRepository } from "../user/interfaces/user.repository";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";
import { UserNotFound } from "../user/exception/user.exception";
import { HomeworkNotFoundException } from "../homework/exception/homework.exception";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
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
    console.log("________________________________update homeworkProgress");
    // Berilgan ID bo'yicha homework progressni qidirish
    const foundData = await this.homeworkProgressRepository.getHomeworkProgress(
      dto.homeworkOrder,
      dto.userId,
      dto.blockId,
    );
    if (!foundData) {
      throw new NotFoundNextProgressException();
    }

    // hamma lessonlar ko'rilganligini tekshirish
    const checkAllLessonsWatched =
      await this.lessonProgressRepository.checkAllLessonsWatched(
        dto.blockOrder,
        dto.userId,
        dto.courseId,
      );

    // oxirgi ko'rilgan lessonProgress ni orderi
    const lastWatchedLessonOrder =
      await this.lessonProgressRepository.findLastWatchedLessonOrder(
        dto.userId,
        dto.courseId,
        dto.blockOrder,
      );
    console.log("lastWatchedLessonOrder", lastWatchedLessonOrder);
    // oxirgi ko'rilgan homeworkProgress ni orderi
    const lastWatchedHomeworkOrder =
      await this.homeworkProgressRepository.findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
        dto.userId,
        dto.blockId,
      );
    console.log("lastWatchedHomeworkOrder", lastWatchedHomeworkOrder);

    // agar hamma lesson va homeworklarni ko'rgan bo'lsa hech narsa o'zgarmaydi faqat hozirgi ko'rayotgan progress ni ma'lumotlarini qaytaradid
    if (
      checkAllLessonsWatched &&
      lastWatchedHomeworkOrder === lastWatchedLessonOrder
    ) {
      return new ResData<HomeworkProgress>(
        "You have already completed this module",
        404,
        foundData,
      );
    }

    // agar lesson dagi ko'rilgan videolar soni homework dagi ko'rilgan videolar sonidan ko'p bo'lmasa error qaytaradi
    if (
      lastWatchedHomeworkOrder >= lastWatchedLessonOrder &&
      dto.homeworkOrder === lastWatchedLessonOrder
    ) {
      throw new LessonNotWatchedException();
    }

    // keyingi homeworkni orderi
    const nextHomeworkOrder = Number(dto.homeworkOrder) + 1;
    console.log("nextHomeworkOrder", nextHomeworkOrder);

    // berilgan homeworkOrder userId va blockId bo'yicha progressni topish
    const nextProgress =
      await this.homeworkProgressRepository.getHomeworkProgress(
        nextHomeworkOrder,
        dto.userId,
        dto.blockId,
      );
    if (!nextProgress) {
      return new ResData<HomeworkProgress>(
        "No further homeworks are available to update progress.",
        404,
        foundData,
      );
    }
    console.log("nextProgress", nextProgress);

    // hozirgi va update bo'lishi kerak bo'lgan progresslar orderlari orasidagi masofa
    const checkOrder =
      Number(nextProgress.homeworkOrder) - Number(foundData.homeworkOrder);
    console.log("checkOrder", checkOrder);

    // bu function temprorary dataBaza dan current progressdan keyingi progress ni topib homeworkOrder ini qaytaradi

    const nextTemprorayProgress =
      await this.userHomeworkProgressRepository.findNextHomeworkProgress(
        dto.homeworkOrder,
        dto.userId,
        dto.blockId,
      );

    // agar temprorary dataBaza da current progressdan keyingi progress mavjud bo'lsa uni homeworkOrder ini o'zgaruvchiga olamiz
    let nextTemporaryProgressOrder = 0;
    if (nextTemprorayProgress) {
      nextTemporaryProgressOrder = Number(nextTemprorayProgress.homeworkOrder);
      console.log("nextTemporaryProgressOrder:", nextTemporaryProgressOrder);
    }
    console.log("nextTemporaryProgress:", nextTemprorayProgress);

    // agar temprorary dataBaza da kelayotgan datalarga mos data bo'lsa temprorary bazadagi data ham update bo'ladi
    const foundTemproraryData =
      await this.userHomeworkProgressRepository.findByUserIdBlockIdAndHomeworkOrder(
        dto.userId,
        dto.blockId,
        dto.homeworkOrder,
      );

    /* agar temprorary dataBaza da keyingi va current progress bo'lsa temprorary dataBaza dagi hamda homeworkProgress baza dagi porgresslarni update qiladi
     */
    if (nextTemprorayProgress && foundTemproraryData) {
      console.log("work");
      await this.userHomeworkProgressRepository.markHomeworkAsWatched(
        nextTemporaryProgressOrder,
        dto.userId,
        dto.blockId,
      );

      // homeworkProgress bazada keyingi ya'ni update bo'lishi kerak bo'lgan progressni topish
      const exitsNextProgress =
        await this.homeworkProgressRepository.getHomeworkProgress(
          nextTemporaryProgressOrder,
          dto.userId,
          dto.blockId,
        );
      const nextProgressOrder = Number(exitsNextProgress.homeworkOrder);
      console.log("exitsNextProgress:", exitsNextProgress);

      // agar homeworkProgress bazada keyingi ya'ni update bo'lishi kerak bo'lgan progress topilsa update qilinadi
      if (exitsNextProgress) {
        await this.homeworkProgressRepository.markHomeworkAsWatched(
          nextProgressOrder,
          dto.userId,
          dto.blockId,
        );

        // current progressni homeworkProgress baza dan countWatched ini 1 ga oshiramiz
        foundData.countWatched = Number(foundData.countWatched) + 1;
        await this.homeworkProgressRepository.update(foundData);
      }

      // Yangilangan homework progress olish
      const updatedNextProgress =
        await this.homeworkProgressRepository.getHomeworkProgress(
          nextTemporaryProgressOrder,
          dto.userId,
          dto.blockId,
        );
      // Yangilangan homework progress qaytariladi
      return new ResData<HomeworkProgress>(
        "OK, next order information below from the progressDatabase",
        200,
        updatedNextProgress,
      );
    }

    // agar temprorary bazada ma'lumotlar bo'lmasa quyidagi kodlar ishlashni boshlaydi

    // homeworkProgress dagi keyingi progress bor bo'lsa hamda keyingi va current progress lar orderlari orasidagi masofa 1 ga teng yoki kichik bo'lsa va ham temprorary baza da ma'lumot bo'lmasa, homeworkPorgress baza dagi progress update qilinadi
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

    // homeworkProgress baza dagi progress update qilingandan so'ng, update qilingan progress data larini olish
    const updatedNextProgress =
      await this.homeworkProgressRepository.getHomeworkProgress(
        nextHomeworkOrder,
        dto.userId,
        dto.blockId,
      );
    // Yangilangan homework progress qaytariladi
    return new ResData<HomeworkProgress>(
      "OK, next order information below from the progressDatabase",
      200,
      updatedNextProgress,
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

    // Progressni o'chirish
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
    // block ma'lumotlarini topish
    const foundBlock = await this.blockRepository.findById(blockId);

    // berilgan blockId bo'yicha faqat course ni Id sini olish
    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);
    const blockOrder = foundBlock.order;

    console.log(
      "________________________________________________________________________________________________getvideo",
    );

    // oxirgi ko'rilgan lesson ni orderi
    const lastWatchedLessonOrder =
      await this.lessonProgressRepository.findLastWatchedLessonOrder(
        userId,
        courseId,
        blockOrder,
      );
    console.log("lastWatchedLessonOrder", lastWatchedLessonOrder);

    // oxirgi ko'rilgan homework ni orderi
    let lastWatchedHomeworkOrder =
      await this.homeworkProgressRepository.findLastWatchedHomeworkOrderByUserIdAndBlockOrder(
        userId,
        blockId,
      );
    console.log("lastWatchedHomeworkOrder", lastWatchedHomeworkOrder);

    // hali lesson da boshidagi 5 ta video ko'rilmagan bo'lsa error qaytaramiz
    if (lastWatchedLessonOrder < 5) {
      throw new LessonNotWatchedException();
    }

    // hamma lessonlar ko'rilganligini tekshirish
    const checkAllLessonsWatched =
      await this.lessonProgressRepository.checkAllLessonsWatched(
        blockOrder,
        userId,
        courseId,
      );

    // Foydalanuvchining progress larini olish
    const existingProgresses =
      await this.homeworkProgressRepository.findByBlocIdAndUserId(
        blockId,
        userId,
      );

    // agar hali hech qanday progress bo'lmasa yangi progresslarni generatsiya qilamiz
    if (existingProgresses.length === 0) {
      await this.generateFiveProgress(userId, blockId);

      // generatsiya qilgandan keyin yana bazaga so'rov jo'natib data larni olamiz
      const existingProgresses =
        await this.homeworkProgressRepository.findByBlocIdAndUserId(
          blockId,
          userId,
        );

      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        existingProgresses,
      );
    }

    // agar hamma homework va lesson videolar ko'rilgan bo'lsa
    if (
      checkAllLessonsWatched &&
      lastWatchedHomeworkOrder === lastWatchedLessonOrder
    ) {
      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        existingProgresses,
      );
    }

    // Barcha homework progressi ko'rilganligini tekshirish
    const isWatchedAllHomework =
      await this.homeworkProgressRepository.areAllWatchedByOrderAndUserId(
        blockOrder,
        userId,
        courseId,
      );
    console.log("isWatchedAllHomework", isWatchedAllHomework);

    // berilgan order gacha bo'lgan lesson lar ko'rildimi yo'qmi aniqlash
    const isAllLessonWatchedUpToOrder =
      await this.lessonProgressRepository.isAllLessonWatched(
        blockOrder,
        lastWatchedHomeworkOrder,
        userId,
        courseId,
      );
    console.log("isAllLessonWatched", isAllLessonWatchedUpToOrder);

    // bor temprorary progresslar hammasi ko'rildimi yo'qmi tekshirish
    const isAllUserHomeworkProgressWatched =
      await this.userHomeworkProgressRepository.areAllWatchedByOrderAndUserId(
        blockOrder,
        userId,
        courseId,
      );
    console.log(
      "isAllUserHomeworkProgressWatched",
      isAllUserHomeworkProgressWatched,
    );

    //// default codes above ____________________________________________________________________________________________________

    // temprorary bazada ma'lumot bor yo'qligin tekshirish
    const existingTemproraryProgress =
      await this.userHomeworkProgressRepository.findByBlockIdAndUserId(
        blockId,
        userId,
      );
    console.log(
      "existingTemproraryProgress",
      existingTemproraryProgress.length,
    );

    // agar temprorary bazada ma'lumot bo'lsa va temprorary baza dagi hamma progresslar ko'rilmagan bo'lsa
    if (
      existingTemproraryProgress.length > 1 &&
      lastWatchedHomeworkOrder < lastWatchedLessonOrder &&
      !isAllUserHomeworkProgressWatched
    ) {
      return new ResData<Array<Partial<HomeworkProgress>>>(
        "Homework fetched successfully DATA from temproraryProgress",
        200,
        existingTemproraryProgress,
      );
    }

    if (
      lastWatchedHomeworkOrder < lastWatchedLessonOrder &&
      !isWatchedAllHomework
    ) {
      return new ResData<Array<Partial<HomeworkProgress>>>(
        "Homework fetched successfully",
        200,
        existingProgresses,
      );
    }

    // agar oxirgi ko'rilgan homework va lesson order lar teng bo'lsa va hamma bor homework progress lar ko'rilgan bo'lsa
    if (
      isWatchedAllHomework &&
      lastWatchedHomeworkOrder === lastWatchedLessonOrder
    ) {
      const temporaryProgress =
        await this.userHomeworkProgressRepository.findByBlockIdAndUserId(
          blockId,
          userId,
        );

      if (temporaryProgress.length > 1) {
        return new ResData<Array<Partial<HomeworkProgress>>>(
          "To watch the next videos, you must first watch all the lesson videos",
          200,
          temporaryProgress,
        );
      }
      return new ResData<Array<Partial<HomeworkProgress>>>(
        "To watch the next videos, you must first watch all the lesson videos",
        200,
        existingProgresses,
      );
    }

    // agar ochiq homework va ochiq lesson larni hammasini ko'rgan bo'lsa progress yaratish
    if (isWatchedAllHomework && isAllLessonWatchedUpToOrder) {
      await this.generateFiveProgress(userId, blockId);

      const existingProgresses =
        await this.homeworkProgressRepository.findByBlocIdAndUserId(
          blockId,
          userId,
        );

      if (existingProgresses.length <= 20) {
        return new ResData<Array<HomeworkProgress>>(
          "Homework fetched successfully",
          200,
          existingProgresses,
        );
      }

      if (existingProgresses.length > 20 && !isAllUserHomeworkProgressWatched) {
        // Eng kichik homeworkOrder qiymatiga ega bo'lgan ma'lumotni topish va yangilash
        const lastFiveProgress =
          await this.homeworkProgressRepository.findTopFiveByBlockIdAndUserId(
            blockId,
            userId,
          );
        console.log("lastFiveProgress", lastFiveProgress.length);
        const randomVideos = await this.getRandomVideos(
          blockOrder,
          courseId,
          userId,
        );
        console.log("randomVideos.length", randomVideos.length);

        let progressList = [...lastFiveProgress, ...randomVideos];
        console.log(",progressList", progressList.length);

        // progresslistni massivini homeworkOrder qiymatiga ko'ra tartiblash
        const sortedProgressList = progressList.sort(
          (a, b) => Number(a.homeworkOrder) - Number(b.homeworkOrder), // Number() bilan number turiga o'tkazish
        );

        for (let i = 0; i < sortedProgressList.length; i++) {
          const video = sortedProgressList[i];

          // Agar eng kichik homeworkOrder bo'lsa, isWatched ni true qilamiz, aks holda false qilamiz
          video.isWatched = i === 0 ? true : false;

          // Database yangilash
          await this.homeworkProgressRepository.update(video);
        }

        await this.userHomeworkProgressRepository.bulkCreate(
          sortedProgressList,
        );

        const data =
          await this.userHomeworkProgressRepository.findByBlockIdAndUserId(
            blockId,
            userId,
          );

        console.log(
          "-------------------------------------------------------------------------------------------------------",
        );
        console.log(
          "________________________________________________________________________temproraryData.length",
        );
        console.log(data.length);

        return new ResData<Array<Partial<HomeworkProgress>>>(
          "Homework fetched successfully DATA from temproraryProgress",
          200,
          data,
        );
      }

      if (existingProgresses.length >= 20 && isAllUserHomeworkProgressWatched) {
        const lastFiveProgress =
          await this.homeworkProgressRepository.findTopFiveByBlockIdAndUserId(
            blockId,
            userId,
          );
        console.log("lastFiveProgress", lastFiveProgress.length);
        const randomVideos = await this.getRandomVideos(
          blockOrder,
          courseId,
          userId,
        );
        console.log(
          "-------------------------------------------------------------------------------------------------------",
        );
        console.log("randomVideos.length", randomVideos.length);
        let progressList = [...lastFiveProgress, ...randomVideos];
        console.log(
          "-------------------------------------------------------------------------------------------------------",
        );
        console.log(",progressList", progressList.length);

        // Random qilingan ma'lumotni bazadan olish
        const isExistTemporaryProgress =
          await this.userHomeworkProgressRepository.findByBlockIdAndUserId(
            blockId,
            userId,
          );
        if (isExistTemporaryProgress) {
          await this.userHomeworkProgressRepository.deleteAll(userId, blockId);
        }

        // progresslistni massivini homeworkOrder qiymatiga ko'ra tartiblash
        const sortedProgressList = progressList.sort(
          (a, b) => Number(a.homeworkOrder) - Number(b.homeworkOrder), // Number() bilan number turiga o'tkazish
        );

        for (let i = 0; i < sortedProgressList.length; i++) {
          const video = sortedProgressList[i];
          console.log("sortedProgressList[i]:", sortedProgressList[i]);

          // Agar eng kichik homeworkOrder bo'lsa, isWatched ni true qilamiz, aks holda false qilamiz
          video.isWatched = i === 0 ? true : false;

          // Database yangilash
          await this.homeworkProgressRepository.update(video);
        }

        await this.userHomeworkProgressRepository.bulkCreate(
          sortedProgressList,
        );

        const data =
          await this.userHomeworkProgressRepository.findByBlockIdAndUserId(
            blockId,
            userId,
          );

        console.log(
          "-------------------------------------------------------------------------------------------------------",
        );
        console.log(
          "________________________________________________________________________temproraryData.length",
        );
        console.log(data.length);

        return new ResData<Array<Partial<HomeworkProgress>>>(
          "Homework fetched successfully DATA from temproraryProgress",
          200,
          data,
        );
      }
    }

    if (existingTemproraryProgress.length === 0) {
      return new ResData<Array<HomeworkProgress>>(
        "Homework fetched successfully",
        200,
        existingProgresses,
      );
    }
    console.log("downnnnnnnnnnnnn");
    return new ResData<Array<Partial<HomeworkProgress>>>(
      "Homework fetched successfully DATA from temprorayProgress",
      200,
      existingTemproraryProgress,
    );
  }

  /**
   * Tasodifiy videolarni olish.
   * @param blockId - Block tartibi
   * @returns Tasodifiy videolar ro'yxati
   */
  private async getRandomVideos(
    blockOrder: ID,
    courseId: ID,
    userId: ID,
  ): Promise<Array<HomeworkProgress>> {
    const randomVideos =
      await this.homeworkProgressRepository.getVideosWithWatchCountBetween0And5(
        blockOrder,
        courseId,
        userId,
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

  async generator(userId: ID, blockId: ID): Promise<Array<HomeworkProgress>> {
    return;
  }
}
