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
<<<<<<< HEAD
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateAlphabetDto } from './dto/create-alphabet.dto';
import { UpdateAlphabetDto } from './dto/update-alphabet.dto';
import { ResData } from 'src/lib/resData';
import { Alphabet } from './entities/alphabet.entity';
import { IAlphabetService } from './interfaces/alphabet.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/common/decorator/auth.decorator';

@ApiTags('alphabet')
@Controller('alphabet')
export class AlphabetController {
  constructor(
    @Inject('IAlphabetService')
    private readonly alphabetService: IAlphabetService,
  ) {}

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('video'))
=======
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
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
  @ApiBody({
    description: "Yuklanadigan image ma'lumotlari",
    type: CreateAlphabetDto,
    schema: {
<<<<<<< HEAD
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
        order: {
          type: 'number',
        },
        courseId: {
          type: 'number',
        },
        video: {
          // Image faylini yuklash maydoni
          type: 'string',
          format: 'binary', // Bu maydon fayl yuklash uchun kerak
=======
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
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
        },
      },
    },
  })
  async create(
    @Body() createAlphabetDto: CreateAlphabetDto,
    @UploadedFile() file: Express.Multer.File, // Yuklangan faylni olish
  ): Promise<ResData<Alphabet>> {
    if (!file) {
<<<<<<< HEAD
      throw new BadRequestException('Fayl yuklanmadi');
=======
      throw new BadRequestException("Fayl yuklanmadi");
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
    }
    return this.alphabetService.create(createAlphabetDto, file);
  }

<<<<<<< HEAD
  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
=======
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
  @Get()
  async findAll(): Promise<ResData<Array<Alphabet>>> {
    return await this.alphabetService.findAll();
  }

<<<<<<< HEAD
  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Alphabet>> {
    return await this.alphabetService.findOneById(id);
  }

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get('by-course/:courseId')
  async getByCourseId(
    @Param('courseId', ParseIntPipe) courseId: number,
=======
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Alphabet>> {
    return await this.alphabetService.findOneById(id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get("by-course/:courseId")
  async getByCourseId(
    @Param("courseId", ParseIntPipe) courseId: number,
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
  ): Promise<ResData<Alphabet[]>> {
    return await this.alphabetService.getAlphabetsByCourseId(courseId);
  }

<<<<<<< HEAD
  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image')) // 'image' - yuklanayotgan fayl maydoni nomi
=======
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("image")) // 'image' - yuklanayotgan fayl maydoni nomi
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
  @ApiBody({
    description: "Yuklanadigan image ma'lumotlari va o'zgarishlar",
    type: UpdateAlphabetDto,
    schema: {
<<<<<<< HEAD
      type: 'object',
      properties: {
        name: { type: 'string' },
        order: { type: 'number' },
        courseId: { type: 'number' },
        image: {
          // Image faylini yuklash maydoni
          type: 'string',
          format: 'binary', // Bu maydon fayl yuklash uchun kerak
=======
      type: "object",
      properties: {
        name: { type: "string" },
        order: { type: "number" },
        courseId: { type: "number" },
        image: {
          // Image faylini yuklash maydoni
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
        },
      },
    },
  })
  async update(
<<<<<<< HEAD
    @Param('id', ParseIntPipe) id: ID,
=======
    @Param("id", ParseIntPipe) id: ID,
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
    @Body() updateAlphabetDto: UpdateAlphabetDto,
    @UploadedFile() file?: Express.Multer.File, // Yuklangan faylni olish (ixtiyoriy)
  ): Promise<ResData<Alphabet>> {
    return await this.alphabetService.update(id, updateAlphabetDto, file);
  }

<<<<<<< HEAD
  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Alphabet>> {
=======
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Alphabet>> {
>>>>>>> 356b137e9ae6021a6c0cb0b886c8045a16fd0fa6
    return await this.alphabetService.delete(id);
  }
}
