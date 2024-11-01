import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  ParseIntPipe,
  Inject,
  Query,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { ResData } from "src/lib/resData";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "./dto/create-homework-progress.dto";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto"; // Yangilash DTO sini import qiling
@ApiTags("homework-progress")
@Controller("homework-progress")
export class HomeworkProgressController {
  constructor(
    @Inject("IHomeworkProgressService")
    private readonly homeworkProgressService: IHomeworkProgressService,
  ) {}

  // Yangi homework progress yozuvi yaratish uchun metod
  @Post()
  async create(
    @Body() createHomeworkProgressDto: CreateHomeworkProgressDto,
  ): Promise<ResData<Partial<HomeworkProgress>>> {
    return await this.homeworkProgressService.create(createHomeworkProgressDto);
  }

  // Barcha homework progress yozuvlarini olish uchun metod
  @Get()
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findAll();
  }

  // Berilgan ID bo'yicha bitta homework progress yozuvini olish uchun metod
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.findOneById(id);
  }

  // Berilgan ID bo'yicha homework progress yozuvini yangilash uchun metod
  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateHomeworkProgressDto: UpdateHomeworkProgressDto, // Yangilash DTO sini oling
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.update(
      id,
      updateHomeworkProgressDto,
    );
  }

  // Tasodifiy videolarni olish uchun metod
  @Get("random-videos")
  async getRandomVideos(
    @Query("order", ParseIntPipe) order: ID,
    @Query("blockId", ParseIntPipe) blockId: ID,
    @Query("userId", ParseIntPipe) userId: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    console.log(order);
    return await this.homeworkProgressService.getRandomVideos(
      order,
      blockId,
      userId,
    );
  }

  // Berilgan order bo'yicha tomosha qilingan videolarni tekshirish uchun metod
  @Get("check-videos/:order")
  async checkWatchedVideos(
    @Param("order", ParseIntPipe) order: ID,
  ): Promise<ResData<boolean>> {
    return await this.homeworkProgressService.getWatchedHomeworkProgressUpToOrder(
      order,
    );
  }
}
