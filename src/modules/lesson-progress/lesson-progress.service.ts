import { Injectable, Inject } from "@nestjs/common";
import { ILessonProgressService } from "./interfaces/lesson-progress.service";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { LessonProgress } from "./entities/lesson-progress.entity";
import {
  LessonProgressAlreadyExistException,
  LessonProgressNotFoundException,
} from "./exception/lesson-progress.exception";
import { ILessonProgressRepository } from "./interfaces/lesson-progress.repository";
import { IUserService } from "../user/interfaces/user.service";
import { ILessonService } from "../lesson/interfaces/lesson.service";
import { UpdateLessonProgressDto } from "./dto/update-lesson-progress.dto";
import { ILessonRepository } from "../lesson/interfaces/lesson.repository";
import { IHomeworkProgressRepository } from "../homework-progress/interfaces/homework-progress.repository";
import { IBlockRepository } from "../block/interfaces/block.repository";

@Injectable()
export class LessonProgressService implements ILessonProgressService {
  constructor(
    @Inject("ILessonProgressRepository")
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject("IUserService") // UserService ni inject qilamiz
    private readonly userService: IUserService,

    @Inject("ILessonService") // LessonService ni inject qilamiz
    private readonly lessonService: ILessonService,

    @Inject("ILessonRepository") // LessonRepository ni inject qilamiz
    private readonly lessonRepository: ILessonRepository,

    @Inject("IHomeworkProgressRepository") // HomeworkRepository ni inject qilamiz
    private readonly homeworkProgressRepository: IHomeworkProgressRepository,

    @Inject("IBlockRepository") // LessonRepository ni inject qilamiz
    private readonly blockRepository: IBlockRepository,
  ) {}

  async findAll(): Promise<ResData<Array<LessonProgress>>> {
    const data = await this.lessonProgressRepository.findAll();

    return new ResData<Array<LessonProgress>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<LessonProgress>> {
    const foundData = await this.lessonProgressRepository.findById(id);
    if (!foundData) {
      throw new LessonProgressNotFoundException();
    }

    return new ResData<LessonProgress>("ok", 200, foundData);
  }

  async update(id: ID): Promise<ResData<LessonProgress>> {
    // `LessonProgress` obyektini topish
    console.log("id", id);
    const foundLessonProgress =
      await this.lessonProgressRepository.findById(id);
    if (!foundLessonProgress) {
      throw new LessonProgressNotFoundException();
    }

    console.log("foundLessonProgress", foundLessonProgress);
    const userId = Number(foundLessonProgress.userId);
    const courseId = Number(foundLessonProgress.courseId);
    const blockId = Number(foundLessonProgress.blockId);

    console.log(userId, courseId, blockId)
    let lastWatchedLessonOrder =
      await this.lessonProgressRepository.findLastWatchedLessonProgress(
        userId,
        courseId,
        blockId,
      );

    console.log("lastWatchedLesson",lastWatchedLessonOrder);
    if (!lastWatchedLessonOrder) {
      lastWatchedLessonOrder.lessonOrder = 0;
    }

    console.log("lastWatchedLessonOrder", lastWatchedLessonOrder.lessonOrder);

    const nextLessonOrder = Number(lastWatchedLessonOrder.lessonOrder) + 1;

    const existingProgress =
      await this.lessonProgressRepository.getLessonProgress(
        nextLessonOrder,
        userId,
        blockId,
      );
    console.log("existingProgress", existingProgress);

    const checkOrder =
      Number(existingProgress.lessonOrder) -
      Number(foundLessonProgress.lessonOrder);
    console.log("checkOrder", checkOrder);

    if (existingProgress && checkOrder <= 1) {
      // Keyingi progressni `isWatched` qilib yangilash
      const data = await this.lessonProgressRepository.markLessonAsWatched(
        nextLessonOrder,
        userId,
        blockId,
      );
      console.log("data", data);
    }

    // Barcha yangilanishlarni `Object.assign` yordamida `foundLessonProgress`ga qo'llash

    return new ResData<LessonProgress>(
      "Lesson progress updated successfully",
      200,
      foundLessonProgress,
    );
  }

  async getVideos(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<Array<LessonProgress>>> {
    // block service dagi metod orqali id bo'yicha ma'lumotni topamiz
    const foundData = await this.blockRepository.findById(blockId);
    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);

    // topilgan ma'lumotni ResData formatda qaytadi uni ichidagi data dan orderni blockOrder o'zgaruvchisiga beramiz
    const blockOrder = foundData.order;

    const existingProgresses =
      await this.lessonProgressRepository.findByOrderAndUserId(blockId, userId);

    if (existingProgresses.length === 0) {
      await this.generateFiveProgress(userId, blockId, blockOrder, courseId);
      // console.log("working")
      const existingProgress =
        await this.lessonProgressRepository.findByOrderAndUserId(
          blockId,
          userId,
        );

      return new ResData<Array<LessonProgress>>(
        "Lesson fetched successfully",
        200,
        existingProgress,
      );
    }

    // user homeworkdagi hozirgi ordergacha bo'lgan hamma videolarni ko'rdimi yo'qmi tekshirish uchun ohirgi isWatched true bo'lgan lesson ni orderi
    // hozircha kerak emas ekan
    // const lastWatchedLessonOrder.lessonOrder =
    //   await this.lessonProgressRepository.findLastWatchedLessonOrderByUserIdAndBlockOrder(
    //     userId,
    //     blockOrder,
    //   );

    const isWatchedHomework =
      await this.homeworkProgressRepository.areAllWatchedByOrderAndUserId(
        blockOrder,
        userId,
        courseId,
      );

    // console.log(isWatchedHomework);
    // Faqat isWatched: true bo'lgan progresslarni sanash
    const watchedProgressCount = existingProgresses.filter(
      (progress) => progress.isWatched === true,
    ).length;

    // Faqat isWatched: false bo'lgan progresslarni sanash
    const notWatchedProgressCount = existingProgresses.filter(
      (progress) => progress.isWatched === false,
    ).length;

    /* agar hamma lesson larni ko'rgan bo'lsa ammo homeworklarni hammasini ko'rmagan bo'lsa bazada bor lessonProgreslarni qaytaramiz error message bilan birga, error messga orqali front user ga siz oldin hamma homeworklar ko'rib tugatishingiz kerak degan yozuv chiqaradi
     */
    if (
      watchedProgressCount % 5 == 0 &&
      notWatchedProgressCount === 0 &&
      !isWatchedHomework
    ) {
      const existingProgress =
        await this.lessonProgressRepository.findByOrderAndUserId(
          blockId,
          userId,
        );

      return new ResData<Array<LessonProgress>>(
        "Keyingi darslarni ko'rish uchun oldin uyga vazifanlarni ko'rishingiz kerak",
        200,
        existingProgress,
      );
    }
    if (
      watchedProgressCount % 5 == 0 &&
      notWatchedProgressCount === 0
      && isWatchedHomework
    ) {
      // Agar isWatched true bo'lgan progresslar soni 5 ga bo'linmasa va isWatched false progresslar bo'lmasa
      await this.generateFiveProgress(userId, blockId, blockOrder, courseId);

      const existingProgresses =
        await this.lessonProgressRepository.findByOrderAndUserId(
          blockId,
          userId,
        );
      return new ResData<Array<LessonProgress>>(
        "Lesson fetched successfully",
        200,
        existingProgresses,
      );
    }

    return new ResData<Array<LessonProgress>>("ok", 200, existingProgresses);
  }

  async generateFiveProgress(
    userId: ID,
    blockId: ID,
    blockOrder: ID,
    courseId: ID,
  ): Promise<Array<LessonProgress>> {
    // Blokni olish
    const block = await this.blockRepository.findById(blockId);

    // Eng oxirgi lessonOrderni olish
    const lastLessonOrder =
      await this.lessonProgressRepository.findMaxLessonOrder(
        blockOrder,
        userId,
        courseId,
      );

    // console.log("lastLessonOrder",lastLessonOrder)

    // lastLessonOrder dan keyingi 5 darsni olish
    const lessons = await this.lessonRepository.findNextFiveLessonsAfterOrder(
      lastLessonOrder || 0, // Agar progress yo'q bo'lsa, 0 dan boshlash
      blockId,
    );

    // console.log("lessons", lessons)

    if (lessons.length < 1) {
      throw new Error("No more lessons available in this block");
    }

    const newProgressList: LessonProgress[] = [];

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];

      // User va lesson kombinatsiyasi uchun progress mavjudligini tekshirish
      const existingProgress =
        await this.lessonProgressRepository.findOneByUserAndLesson(
          userId,
          lesson.id,
        );
      if (existingProgress) {
        throw new LessonProgressAlreadyExistException();
      }

      // Yangi LessonProgress obyektini yaratish
      const newLessonProgress = new LessonProgress();
      newLessonProgress.user = { id: userId } as any; // userni id bilan bog'lash
      newLessonProgress.userId = userId;
      newLessonProgress.blockId = blockId;
      newLessonProgress.lesson = lesson;
      newLessonProgress.courseId = courseId;
      newLessonProgress.blockOrder = block.order;
      newLessonProgress.lessonOrder = lesson.order;

      // Birinchi dars uchun `isWatched` true, qolganlari uchun false
      newLessonProgress.isWatched = i === 0;

      // Yangi progressni bazaga saqlash
      const savedProgress =
        await this.lessonProgressRepository.create(newLessonProgress);
      newProgressList.push(savedProgress);
    }

    // Yangi progresslar yaratib bo'lgach, barcha progresslarni olish
    const allProgresses =
      await this.lessonProgressRepository.findByOrderAndUserId(blockId, userId);

    return allProgresses;
  }
}

// INSERT INTO homeworks (title, video_url, mime_type, size, "order", duration, block_id)
// SELECT
//     'Generated description for homework ' || i,
//     'https://player.vimeo.com/video/1031009633',
//     'video/mp4',
//     1024000 + (i * 1000),  -- Fayl hajmini oshib boruvchi qiymat sifatida o'zgartirish
//     i,  -- Order ketma-ketlikda oshib boradi
//     300 + (i * 10),  -- Davomiylik oshib boruvchi qiymat sifatida
//     41  -- block_id
// FROM
//     generate_series(1, 30) AS s(i);
