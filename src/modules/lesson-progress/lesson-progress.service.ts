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
    console.log("foundData", foundData);
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
    const updatedData = await this.lessonProgressRepository.update(foundLessonProgress);

    return new ResData<LessonProgress>(
      "Lesson progress updated successfully",
      200,
      updatedData,
    );
  }
}
