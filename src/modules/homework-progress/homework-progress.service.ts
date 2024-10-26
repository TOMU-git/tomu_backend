import { Injectable, Inject } from "@nestjs/common";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IUserService } from "../user/interfaces/user.service";
import { IHomeworkService } from "../homework/interfaces/homework.service";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { IHomeworkProgressRepository } from "./interfaces/homework-progress.repository";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "./dto/create-homework-progress.dto";
import {
  HomeworkProgressAlreadyExistException,
  HomeworkProgressNotFoundException,
} from "./exception/homework-progress.exception";

@Injectable()
export class HomeworkProgressService implements IHomeworkProgressService {
  constructor(
    @Inject("IHomeworkProgressRepository")
    private readonly homeworkProgressRepository: IHomeworkProgressRepository,

    @Inject("IUserService") // UserService ni inject qilamiz
    private readonly userService: IUserService,

    @Inject("IHomeworkService") // HomeworkService ni inject qilamiz
    private readonly homeworkService: IHomeworkService,
  ) {}

  async create(
    dto: CreateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>> {
    console.log(
      "Creating homework progress with userId:",
      dto.userId,
      "and homeworkId:",
      dto.homeworkId,
    );

    // User va homework mavjudligini tekshirish
    const foundUser = await this.userService.findOneById(dto.userId); // UserService orqali foydalanuvchini topamiz
    const foundHomework = await this.homeworkService.findOneById(
      dto.homeworkId,
    ); // HomeworkService orqali darsni topamiz

    // Darsning foydalanuvchiga bog'langan yozuvi borligini tekshirish
    const foundData =
      await this.homeworkProgressRepository.findOneByUserAndHomework(
        dto.userId,
        dto.homeworkId,
      );
    console.log("foundData", foundData);
    if (foundData) {
      throw new HomeworkProgressAlreadyExistException();
    }

    let newHomeworkProgress = new HomeworkProgress();
    newHomeworkProgress = Object.assign(newHomeworkProgress, dto);
    const newData =
      await this.homeworkProgressRepository.create(newHomeworkProgress);
    console.log("newData:", newData);

    return new ResData<HomeworkProgress>(
      "Homework progress created successfully",
      201,
      newData,
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
}
