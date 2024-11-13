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
  Delete,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { ResData } from "src/lib/resData";
import { ApiProperty, ApiTags } from "@nestjs/swagger";
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

  /**
   * Yangi homework progress yozuvi yaratish.
   * @param createHomeworkProgressDto - Yangi homework progress yaratish uchun kerakli ma'lumotlarni o'z ichiga olgan DTO.
   * @returns Yangi yaratilingan homework progress
   */
  @Post()
  async create(
    @Body() createHomeworkProgressDto: CreateHomeworkProgressDto,
  ): Promise<ResData<Partial<HomeworkProgress>>> {
    return await this.homeworkProgressService.create(createHomeworkProgressDto);
  }

  /**
   * Berilgan ID bo'yicha bitta homework progress yozuvini olish.
   * @param id - Homework progress yozuvini olish uchun kerakli ID
   * @returns Berilgan ID bo'yicha homework progress
   */
  @Get("findOne/:id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findByUserId(id);
  }

  /**
   * Foydalanuvchi uchun videos ro'yxatini olish va cache'dan tekshirish.
   * @param userId - Foydalanuvchi ID
   * @param blockId - Block ID
   * @param blockOrder - Block tartibi
   * @returns Video ro'yxati yoki cached progress
   */
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("get-videos")
  async getVideos(
    @Query("userId", ParseIntPipe) userId: ID,
    @Query("blockId", ParseIntPipe) blockId: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    console.log("controller");
    return await this.homeworkProgressService.getVideos(
      userId,
      blockId,
    );
  }

  /**
   * Barcha homework progress yozuvlarini olish.
   * @returns Barcha homework progress yozuvlari
   */
  @Get()
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findAll();
  }

  /**
   * Berilgan ID bo'yicha homework progress yozuvini yangilash.
   * @param id - Yangilanish uchun kerakli ID
   * @param updateHomeworkProgressDto - Yangilash uchun kerakli ma'lumotlar
   * @returns Yangilangan homework progress
   */
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

  /**
   * Berilgan ID bo'yicha homework progress yozuvini o'chirish.
   * @param id - O'chirish uchun kerakli ID
   * @returns O'chirilgan homework progress
   */
  @Delete(":id")
  async delete(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.delete(id);
  }
}
