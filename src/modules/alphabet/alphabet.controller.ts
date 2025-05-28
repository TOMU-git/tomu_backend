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
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateAlphabetDto } from "./dto/create-alphabet.dto";
import { UpdateAlphabetDto } from "./dto/update-alphabet.dto";
import { ResData } from "src/lib/resData";
import { Alphabet } from "./entities/alphabet.entity";
import { IAlphabetService } from "./interfaces/alphabet.service";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { Auth } from "src/common/decorator/auth.decorator";

@ApiTags("alphabet")
@Controller("alphabet")
export class AlphabetController {
  constructor(
    @Inject("IAlphabetService")
    private readonly alphabetService: IAlphabetService,
  ) {}

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video"))
  @ApiBody({
    description: "Yuklanadigan image ma'lumotlari",
    type: CreateAlphabetDto,
    schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
        },
        order: {
          type: "number",
        },
        courseId: {
          type: "number",
        },
        video: {
          // Image faylini yuklash maydoni
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async create(
    @Body() createAlphabetDto: CreateAlphabetDto,
    @UploadedFile() file: Express.Multer.File, // Yuklangan faylni olish
  ): Promise<ResData<Alphabet>> {
    if (!file) {
      throw new BadRequestException("Fayl yuklanmadi");
    }
    return this.alphabetService.create(createAlphabetDto, file);
  }
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<Alphabet>>> {
    return await this.alphabetService.findAll();
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Alphabet>> {
    return await this.alphabetService.findOneById(id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get("by-course/:courseId")
  async getByCourseId(
    @Param("courseId", ParseIntPipe) courseId: number,
  ): Promise<ResData<Alphabet[]>> {
    return await this.alphabetService.getAlphabetsByCourseId(courseId);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'image' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan image ma'lumotlari va o'zgarishlar",
    type: UpdateAlphabetDto,
    schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        order: { type: "number" },
        courseId: { type: "number" },
        video: {
          // Image faylini yuklash maydoni
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateAlphabetDto: UpdateAlphabetDto,
    @UploadedFile() file?: Express.Multer.File, // Yuklangan faylni olish (ixtiyoriy)
  ): Promise<ResData<Alphabet>> {
    return await this.alphabetService.update(id, updateAlphabetDto, file);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Alphabet>> {
    return await this.alphabetService.delete(id);
  }
}
