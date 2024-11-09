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
  BadRequestException,
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
import { IsNumberString } from "class-validator";

export class GetVideosQueryDto {
  @ApiProperty({ description: "Block ID raqamda kiritilishi kerak" })
  @IsNumberString({}, { message: "blockId raqam bo‘lishi kerak" })
  blockId: string;

  @ApiProperty({ description: "User ID raqamda kiritilishi kerak" })
  @IsNumberString({}, { message: "userId raqam bo‘lishi kerak" })
  userId: string;
}
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

  // Berilgan ID bo'yicha bitta homework progress yozuvini olish uchun metod
  @Get("findOne/:id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findByUserId(id);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("get-videos")
  async getVideos(
    @Query("userId", ParseIntPipe) userId: ID,
    @Query("blockId", ParseIntPipe) blockId: ID,
    @Query("blockOrder", ParseIntPipe) blockOrder: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    console.log("controller");
    return await this.homeworkProgressService.getVideos(
      userId,
      blockId,
      blockOrder,
    );
  }

  // Barcha homework progress yozuvlarini olish uchun metod
  @Get()
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findAll();
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

  @Delete(":id")
  async delete(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.delete(id);
  }

  // Videolarni olish
}
