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

@Injectable()
export class LessonProgressService implements ILessonProgressService {
  constructor(
    @Inject("ILessonProgressRepository")
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject("IUserService") // UserService ni inject qilamiz
    private readonly userService: IUserService,

    @Inject("ILessonService") // LessonService ni inject qilamiz
    private readonly lessonService: ILessonService,

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
    console.log("newData:", newData);

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

  async test(bId: ID, uId: ID): Promise<ResData<Array<LessonProgress>>> {
    const check = await this.lessonProgressRepository.findIfAllWatched(
      1,
      15,
      11,
    );
    // console.log("check", check);
    const data = await this.lessonProgressRepository.findByOrderAndUserId(
      uId,
      bId,
    );

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

    // Agar `updateDto` ichida yangi `userId`, `lessonId`, yoki `blockId` berilgan bo'lsa, tegishli ob'ektlarni tekshirish
    if (updateDto.userId) {
      const { data: foundUser } = await this.userService.findOneById(
        updateDto.userId,
      );
      if (!foundUser) {
        throw new Error("User not found");
      }
      foundLessonProgress.user = foundUser;
    }

    if (updateDto.lessonId) {
      const { data: foundLesson } = await this.lessonService.findOneById(
        updateDto.lessonId,
      );
      if (!foundLesson) {
        throw new Error("Lesson not found");
      }
      foundLessonProgress.lesson = foundLesson;
      foundLessonProgress.lessonOrder = foundLesson.order;
    }

    if (updateDto.blockId) {
      const { data: foundBlock } = await this.blockService.findOneById(
        updateDto.blockId,
      );
      if (!foundBlock) {
        throw new Error("Block not found");
      }
      foundLessonProgress.blockOrder = foundBlock.order;
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
    blockOrder: ID
  ): Promise<ResData<Array<LessonProgress>>> {
    const progressExist = await this.lessonProgressRepository.findAll();
    if (progressExist.length < 1) {
      const tenProgress = await this.generateTenProgress(userId, blockId)
      return tenProgress
    }

    return;
  }

  async generateTenProgress(
    userId: ID,
    blockId: ID,
  ): Promise<ResData<LessonProgress[]>> {
    // Blokni olish
    const { data: block } = await this.blockService.findOneById(blockId);
    if (!block) {
      throw new Error("Block not found");
    }

    // Blokdagi barcha darslarni olish
    const { data: lessons } =
      await this.lessonService.getLessonsByBlockId(blockId);
    if (lessons.length < 10) {
      throw new Error("Block does not contain enough lessons");
    }

    // Faqat 10 ta darsni olish
    const lessonsToProcess = lessons.slice(0, 10);
    const newProgressList: LessonProgress[] = [];

    // Har bir dars uchun yangi progress yaratish
    for (const lesson of lessonsToProcess) {
      // User va lesson kombinatsiyasi uchun progress mavjudligini tekshirish
      const existingProgress =
        await this.lessonProgressRepository.findOneByUserAndLesson(
          userId,
          lesson.id,
        );
      if (existingProgress) {
        throw new LessonProgressAlreadyExistException();
      }

      // Yangi LessonProgress obyektini yaratamiz va kerakli maydonlarni to'ldiramiz
      const newLessonProgress = new LessonProgress();
      newLessonProgress.user = { id: userId } as any; // userni id bilan bog'lash
      newLessonProgress.userId = userId;
      newLessonProgress.lesson = lesson;
      newLessonProgress.blockOrder = block.order;
      newLessonProgress.lessonOrder = lesson.order;

      // Yangi progressni bazaga saqlaymiz
      const savedProgress =
        await this.lessonProgressRepository.create(newLessonProgress);
      newProgressList.push(savedProgress);
    }

    return new ResData<LessonProgress[]>(
      "Ten lesson progress records created successfully",
      201,
      newProgressList,
    );
  }
}
