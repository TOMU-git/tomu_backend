import { Injectable, Inject } from "@nestjs/common";
import { ILessonProgressService } from "./interfaces/lesson-progress.service";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { CreateLessonProgressDto } from "./dto/create-lesson-progress.dto";
import {
  LessonProgressAlreadyExistException,
  LessonProgressNotFoundException,
} from "./exception/lesson-progress.exception";
import { ILessonProgressRepository } from "./interfaces/lesson-progress.repository";
import { IUserService } from "../user/interfaces/user.service";
import { ILessonService } from "../lesson/interfaces/lesson.service";
import { IBlockService } from "../block/interfaces/block.service";
import { UpdateLessonProgressDto } from "./dto/update-lesson-progress.dto";
import { ILessonRepository } from "../lesson/interfaces/lesson.repository";
import { IHomeworkProgressRepository } from "../homework-progress/interfaces/homework-progress.repository";

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

    @Inject("IBlockService") // LessonService ni inject qilamiz
    private readonly blockService: IBlockService,
  ) {}

  async create(dto: CreateLessonProgressDto): Promise<ResData<LessonProgress>> {
    // User va lesson mavjudligini tekshirish
    const { data: foundUser } = await this.userService.findOneById(dto.userId); // UserService orqali foydalanuvchini topamiz

    const { data: foundLesson } = await this.lessonService.findOneById(
      dto.lessonId,
    ); // LessonService orqali darsni topamiz

    const { data: foundBlock } = await this.blockService.findOneById(
      dto.blockId,
    ); // BlockService orqali block topamiz

    // Darsning foydalanuvchiga bog'langan yozuvi borligini tekshirish
    const foundData =
      await this.lessonProgressRepository.findOneByUserAndLesson(
        dto.userId,
        dto.lessonId,
      );
    if (foundData) {
      throw new LessonProgressAlreadyExistException();
    }

    let newLessonProgress = new LessonProgress();
    (newLessonProgress.blockOrder = foundBlock.order),
      (newLessonProgress.user = foundUser),
      (newLessonProgress.lesson = foundLesson),
      (newLessonProgress.lessonOrder = foundLesson.order),
      (newLessonProgress = Object.assign(newLessonProgress, dto));
    const newData =
      await this.lessonProgressRepository.create(newLessonProgress);

    return new ResData<LessonProgress>(
      "Lesson progress created successfully",
      201,
      newData,
    );
  }

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

  async update(
    id: ID,
    updateDto: UpdateLessonProgressDto,
  ): Promise<ResData<LessonProgress>> {
    // `LessonProgress` obyektini topish
    const foundLessonProgress =
      await this.lessonProgressRepository.findById(id);
    if (!foundLessonProgress) {
      throw new LessonProgressNotFoundException();
    }

    const lastWatchedLessonOrder =
      await this.lessonProgressRepository.findLastWatchedLessonOrderByUserIdAndBlockOrder(
        updateDto.userId,
        updateDto.blockOrder,
      );

    const nextLessonOrder = Number(lastWatchedLessonOrder) + 1;

    const existingProgress =
      await this.lessonProgressRepository.existsLessonProgress(
        nextLessonOrder,
        updateDto.userId,
        updateDto.blockOrder,
      );

    if (existingProgress) {
      // Keyingi progressni `isWatched` qilib yangilash
      await this.lessonProgressRepository.markLessonAsWatched(
        nextLessonOrder,
        updateDto.userId,
        updateDto.blockOrder,
      );
    }

    // Barcha yangilanishlarni `Object.assign` yordamida `foundLessonProgress`ga qo'llash
    Object.assign(foundLessonProgress, updateDto);

    // Yangilangan `LessonProgress` obyektini saqlash
    const updatedData =
      await this.lessonProgressRepository.update(foundLessonProgress);

    return new ResData<LessonProgress>(
      "Lesson progress updated successfully",
      200,
      updatedData,
    );
  }

  async getVideos(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<Array<LessonProgress>>> {
    // block service dagi metod orqali id bo'yicha ma'lumotni topamiz
    const foundData = await this.blockService.findOneById(blockId);

    // topilgan ma'lumotni ResData formatda qaytadi uni ichidagi data dan orderni blockOrder o'zgaruvchisiga beramiz
    const blockOrder = foundData.data.order;

    const existingProgresses =
      await this.lessonProgressRepository.findByOrderAndUserId(
        blockOrder,
        userId,
      );

    if (existingProgresses.length === 0) {
      await this.generateFiveProgress(userId, blockId, blockOrder);
      const existingProgress =
        await this.lessonProgressRepository.findByOrderAndUserId(
          blockOrder,
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
    // const lastWatchedLessonOrder =
    //   await this.lessonProgressRepository.findLastWatchedLessonOrderByUserIdAndBlockOrder(
    //     userId,
    //     blockOrder,
    //   );

    const isWatchedHomework =
      await this.homeworkProgressRepository.areAllWatchedByOrderAndUserId(
        blockOrder,
        userId,
      );

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
          blockOrder,
          userId,
        );

      return new ResData<Array<LessonProgress>>(
        "You must have seen all the homework before",
        200,
        existingProgress,
      );
    }
    if (
      watchedProgressCount % 5 == 0 &&
      notWatchedProgressCount === 0 &&
      isWatchedHomework
    ) {
      // Agar isWatched true bo'lgan progresslar soni 5 ga bo'linmasa va isWatched false progresslar bo'lmasa
      await this.generateFiveProgress(userId, blockId, blockOrder);

      const existingProgresses =
        await this.lessonProgressRepository.findByOrderAndUserId(
          blockOrder,
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
  ): Promise<Array<LessonProgress>> {
    // Blokni olish
    const { data: block } = await this.blockService.findOneById(blockId);

    // Eng oxirgi lessonOrderni olish
    const lastLessonOrder =
      await this.lessonProgressRepository.findHighestLessonOrderByUserAndBlock(
        blockOrder,
        userId,
      );

    // lastLessonOrder dan keyingi 5 darsni olish
    const lessons = await this.lessonRepository.findNextFiveLessonsAfterOrder(
      lastLessonOrder || 0, // Agar progress yo'q bo'lsa, 0 dan boshlash
      blockId,
    );

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
      newLessonProgress.lesson = lesson;
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
      await this.lessonProgressRepository.findByOrderAndUserId(
        block.order,
        userId,
      );

    return allProgresses;
  }
}

// INSERT INTO homeworks (description, video_url, mime_type, size, "order", duration, block_id)
// SELECT
//     'Generated description for homework ' || i,
//     'https://player.vimeo.com/video/1028316276',
//     'video/mp4',
//     1024000 + (i * 1000),  -- Fayl hajmini oshib boruvchi qiymat sifatida o'zgartirish
//     i,  -- Order ketma-ketlikda oshib boradi
//     300 + (i * 10),  -- Davomiylik oshib boruvchi qiymat sifatida
//     30  -- block_id
// FROM
//     generate_series(1, 100) AS s(i);
