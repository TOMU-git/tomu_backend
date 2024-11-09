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
    blockOrder: ID,
  ): Promise<ResData<Array<LessonProgress>>> {
    const existingProgresses =
      await this.lessonProgressRepository.findByOrderAndUserId(
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


    // Agar isWatched true bo'lgan progresslar soni 10 ga bo'linmasa va isWatched false progresslar bo'lmasa
    if (
      (watchedProgressCount % 10 == 0 && notWatchedProgressCount === 0) ||
      existingProgresses.length === 0
    ) {
      const tenProgress = await this.generateTenProgress(
        userId,
        blockId,
        blockOrder,
      );
      return new ResData<Array<LessonProgress>>(
        "Lesson fetched successfully",
        200,
        tenProgress,
      );
    }

    return new ResData<Array<LessonProgress>>("ok", 200, existingProgresses);
  }

  async generateTenProgress(
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

    // lastLessonOrder dan keyingi 10 darsni olish
    const lessons = await this.lessonRepository.findNextTenLessonsAfterOrder(
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
