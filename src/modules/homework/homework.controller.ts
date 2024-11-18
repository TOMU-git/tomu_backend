import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Inject,
  UploadedFile,
  BadRequestException,
  UseInterceptors,
  Query,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateHomeworkDto } from "./dto/create-homework.dto";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { ResData } from "src/lib/resData";
import { Homework } from "./entities/homework.entity";
import { IHomeworkService } from "./interfaces/homework.service";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { Auth } from "src/common/decorator/auth.decorator";
import { FileInterceptor } from "@nestjs/platform-express";
import { get } from "axios";

@ApiTags("homework")
@Controller("homework")
export class HomeworkController {
  constructor(
    @Inject("IHomeworkService")
    private readonly homeworkService: IHomeworkService,
  ) {}

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan video ma'lumotlari",
    type: CreateHomeworkDto,
    // Swaggervida yuklanadigan fayl haqida ma\'lumot
    // video maydonini qo'shishingiz mumkin
    schema: {
      type: "object",
      properties: {
        description: {
          type: "string",
        },
        order: {
          type: "number",
        },
        blockId: {
          type: "number",
        },
        video: {
          // Video faylini y  uklash maydoni
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async create(
    @Body() createHomework: CreateHomeworkDto,
    @UploadedFile() file: Express.Multer.File, // Yuklangan faylni olish
  ): Promise<ResData<Homework>> {
    if (!file) {
      throw new BadRequestException("Fayl yuklanmadi");
    }
    return this.homeworkService.create(createHomework, file); // Yangi darsni yaratish
  }

  @Get("get-five-videos")
  async getNextFiveVideos(
    @Query("order", ParseIntPipe) order: ID,
    @Query("blockId", ParseIntPipe) blockId: ID,
  ): Promise<ResData<Array<Homework>>> {
    return await this.homeworkService.getNextFiveVideos(order, blockId);
  }

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<Homework>>> {
    return await this.homeworkService.findAll();
  }

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Homework>> {
    return await this.homeworkService.findOneById(id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get("by-block/:blockId")
  async getByBlockId(
    @Param("blockId", ParseIntPipe) blockId: number,
  ): Promise<ResData<Homework[]>> {
    return await this.homeworkService.getHomeworksByBlockId(blockId);
  }
  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan video ma'lumotlari",
    type: CreateHomeworkDto,
    // Swaggervida yuklanadigan fayl haqida ma\'lumot
    // video maydonini qo'shishingiz mumkin
    schema: {
      type: "object",
      properties: {
        order: {
          type: "number",
        },
        blockId: {
          type: "number",
        },
        video: {
          // Video faylini y  uklash maydoni
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async update(
    @Body() updateHomeworkDto: UpdateHomeworkDto,
    @Param("id", ParseIntPipe) id: ID,
    @UploadedFile() file: Express.Multer.File, // Yuklangan faylni olish
  ): Promise<ResData<Homework>> {
    return this.homeworkService.update(id, updateHomeworkDto, file); // Yangi darsni yaratish
  }

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Homework>> {
    return await this.homeworkService.delete(id);
  }
}
