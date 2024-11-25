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
import { ILessonRepository } from "../lesson/interfaces/lesson.repository";
import { IHomeworkProgressRepository } from "../homework-progress/interfaces/homework-progress.repository";
import { IBlockRepository } from "../block/interfaces/block.repository";
import { BlockNotFoundException } from "../block/exception/block.exception";

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
    console.log(id);
    const foundLessonProgress =
      await this.lessonProgressRepository.findById(id);
    if (!foundLessonProgress) {
      throw new LessonProgressNotFoundException();
    }

    if (!foundLessonProgress.isWatched) {
      return new ResData<LessonProgress>(
        "You should watch the previous video",
        200,
        foundLessonProgress,
      );
    }

    const userId = Number(foundLessonProgress.userId);
    const courseId = Number(foundLessonProgress.courseId);
    const blockId = Number(foundLessonProgress.blockId);
    const blockOrder = Number(foundLessonProgress.blockOrder);

    const lastWatchedLessonOrder =
      await this.lessonProgressRepository.findLastWatchedLessonOrder(
        userId,
        courseId,
        blockOrder,
      );

    const lastWatchedHomeworkOrder =
      await this.homeworkProgressRepository.findLastWatchedHomework(
        courseId,
        userId,
        blockOrder,
      );

    console.log("lastWatchedLessonOrder", lastWatchedLessonOrder);
    console.log("lastWatchedHomeworkOrder", lastWatchedHomeworkOrder);
    const checkAllHomework =
      await this.homeworkProgressRepository.areAllHomeworksWatchedUpToOrder(
        blockOrder,
        userId,
        courseId,
        lastWatchedLessonOrder,
      );
    console.log("checkAllHomework", checkAllHomework);

    const nextLessonOrder = Number(foundLessonProgress.lessonOrder) + 1;

    if (!lastWatchedHomeworkOrder && lastWatchedLessonOrder < 5) {
      const existingProgress =
        await this.lessonProgressRepository.getLessonProgress(
          nextLessonOrder,
          userId,
          blockId,
        );

      if (existingProgress) {
        // Keyingi progressni `isWatched` qilib yangilash
        await this.lessonProgressRepository.markLessonAsWatched(
          nextLessonOrder,
          userId,
          blockId,
        );
      }
      return new ResData<LessonProgress>(
        "Lesson progress updated successfully ",
        200,
        foundLessonProgress,
      );
    }

    if (!lastWatchedHomeworkOrder) {
      console.log("tushdi")
      // agar berilgan ordergacha bo'lgan homeworklarni ko'rmagan bo'lsa update qilmaymiz
      return new ResData<LessonProgress>(
        "To view the next lessons, you must first view the homework assignments",
        200,
        foundLessonProgress,
      );
    }



    if (
      lastWatchedLessonOrder % 5 === 0 &&
      !checkAllHomework &&
      lastWatchedLessonOrder >= 5

    ) {
      // agar berilgan ordergacha bo'lgan homeworklarni ko'rmagan bo'lsa update qilmaymiz
      return new ResData<LessonProgress>(
        "To view the next lessons, you must first view the homework assignments",
        200,
        foundLessonProgress,
      );
    }
// lastWatchedLessonOrder 10
// lastWatchedHomeworkOrder 5
// checkAllHomework true

    const orderDistance = Number(lastWatchedLessonOrder) - Number(lastWatchedHomeworkOrder)
    if (
      lastWatchedLessonOrder % 5 === 0 &&
      checkAllHomework &&
      orderDistance >= 5
    ) {
      // agar berilgan ordergacha bo'lgan homeworklarni ko'rmagan bo'lsa update qilmaymiz
      return new ResData<LessonProgress>(
        "To view the next lessons, you must first view the homework assignments",
        200,
        foundLessonProgress,
      );
    }

    const existingProgress =
      await this.lessonProgressRepository.getLessonProgress(
        nextLessonOrder,
        userId,
        blockId,
      );

    if (existingProgress) {
      // Keyingi progressni `isWatched` qilib yangilash
      await this.lessonProgressRepository.markLessonAsWatched(
        nextLessonOrder,
        userId,
        blockId,
      );
    }
    return new ResData<LessonProgress>(
      "Lesson progress updated successfully ",
      200,
      foundLessonProgress,
    );
  }

  async getVideos(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<Array<LessonProgress>>> {
    const courseId = await this.blockRepository.getCourseIdByBlockId(blockId);
    const existingProgresses =
      await this.lessonProgressRepository.findByBlockIdAndUserId(
        blockId,
        userId,
      );

    const block = await this.blockRepository.findById(blockId);

    if (!block) {
      throw new BlockNotFoundException();
    }
    const blockOrder = block?.order;

    if (existingProgresses.length === 0) {
      await this.generateFiveProgress(userId, blockId, courseId);
      const existingProgress =
        await this.lessonProgressRepository.findByBlockIdAndUserId(
          blockId,
          userId,
        );

      return new ResData<Array<LessonProgress>>(
        "Lesson fetched successfully",
        200,
        existingProgress,
      );
    }

    const lastWatchedLessonOrder =
      await this.lessonProgressRepository.findLastWatchedLessonOrder(
        userId,
        courseId,
        blockOrder,
      );

    const lastWatchedHomeworkOrder =
      await this.homeworkProgressRepository.findLastWatchedHomework(
        courseId,
        userId,
        blockOrder,
      );

    const checkAllHomework =
      await this.homeworkProgressRepository.areAllHomeworksWatchedUpToOrder(
        blockOrder,
        userId,
        courseId,
        lastWatchedLessonOrder,
      );

    if (lastWatchedLessonOrder % 5 === 0 && !checkAllHomework) {
      // agar berilgan ordergacha bo'lgan homeworklarni ko'rmagan bo'lsa update qilmaymiz
      return new ResData<Array<LessonProgress>>(
        "To view the next lessons, you must first view the homework assignments",
        200,
        existingProgresses,
      );
    }

    const orderDistance = Number(lastWatchedLessonOrder) - Number(lastWatchedHomeworkOrder)
    if (
      lastWatchedLessonOrder % 5 === 0 &&
      checkAllHomework &&
      orderDistance >= 5
    ) {
      // agar berilgan ordergacha bo'lgan homeworklarni ko'rmagan bo'lsa update qilmaymiz
      return new ResData<Array<LessonProgress>>(
        "To view the next lessons, you must first view the homework assignments",
        200,
        existingProgresses,
      );
    }

    return new ResData<Array<LessonProgress>>("ok", 200, existingProgresses);
  }

  async generateFiveProgress(
    userId: ID,
    blockId: ID,
    courseId: ID,
  ): Promise<Array<LessonProgress>> {
    // Blokni olish
    const block = await this.blockRepository.findById(blockId);

    const lessons = await this.lessonRepository.findLessonsByBlockId(blockId);

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
      await this.lessonProgressRepository.findByBlockIdAndUserId(
        blockId,
        userId,
      );

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
//     32  -- block_id
// FROM
//     generate_series(1, 100) AS s(i);
