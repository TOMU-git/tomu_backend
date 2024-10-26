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
  UseInterceptors,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ResData } from 'src/lib/resData';
import { Lesson } from './entities/lesson.entity';
import { ILessonService } from './interfaces/lesson.service';
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/common/decorator/auth.decorator';

@ApiTags("lesson")
@Controller("lesson")
export class LessonController {
  constructor(
    @Inject("ILessonService")
    private readonly lessonService: ILessonService,
  ) {}

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan video ma'lumotlari",
    type: CreateLessonDto,
    // Swaggervida yuklanadigan fayl haqida ma\'lumot
    // video maydonini qo'shishingiz mumkin
    schema: {
      type: "object",
      properties: {
        title: {
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
          type: 'string',
          format: 'binary', // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async create(
    @Body() createLessonDto: CreateLessonDto,
    @UploadedFile() file: Express.Multer.File, // Yuklangan faylni olish
  ): Promise<ResData<Lesson>> {
    if (!file) {
      throw new BadRequestException("Fayl yuklanmadi");
    }
    return this.lessonService.create(createLessonDto, file); // Yangi darsni yaratish
  }

  @Get()
  async findAll(): Promise<ResData<Array<Lesson>>> {
    return await this.lessonService.findAll();
  }

  @ApiQuery({
    name: "module_id",
    required: true,
    type: Number,
    description: 'For module id',
  })
  @Get("/ten-videos")
  async findTenVideos(@Query("module_id") module_id: number) {
    return await this.lessonService.findVideos(module_id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.findOneById(id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get("by-block/:blockId")
  async getByBlockId(
    @Param("blockId", ParseIntPipe) blockId: number,
  ): Promise<ResData<Lesson[]>> {
    return await this.lessonService.getLessonsByBlockId(blockId);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan video ma'lumotlari va o'zgarishlar",
    type: UpdateLessonDto,
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        order: { type: "number" },
        blockId: { type: "number" },
        video: {
          // Video faylini yuklash maydoni
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateLessonDto: UpdateLessonDto,
    @UploadedFile() file?: Express.Multer.File, // Yuklangan faylni olish (ixtiyoriy)
  ): Promise<ResData<Lesson>> {
    return await this.lessonService.update(id, updateLessonDto, file);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.delete(id);
  }
}
