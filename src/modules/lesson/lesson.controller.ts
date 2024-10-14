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
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ResData } from 'src/lib/resData';
import { Lesson } from './entities/lesson.entity';
import { ILessonService } from './interfaces/lesson.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { RoleEnum } from 'src/common/enums/enum';
import { Roles } from '../auth/decorator/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Auth } from 'src/common/decorator/auth.decorator';

@ApiTags('lesson')
@Controller('lesson')
export class LessonController {
  constructor(
    @Inject('ILessonService')
    private readonly lessonService: ILessonService,
  ) {}
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('video')) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan video ma'lumotlari",
    type: CreateLessonDto,
    // Swaggervida yuklanadigan fayl haqida ma\'lumot
    // video maydonini qo'shishingiz mumkin
    schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
        },
        order: {
          type: 'number',
        },
        blockId: {
          type: 'number',
        },
        grammarId: {
          type: 'number',
        },
        homeworkId: {
          type: 'number',
        },
        video: {
          // Video faylini yuklash maydoni
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
    console.log('working controller');
    console.log(file); // Fayl obyektini konsolda tekshirish
    if (!file) {
      throw new BadRequestException('Fayl yuklanmadi');
    }
    return this.lessonService.create(createLessonDto, file); // Yangi darsni yaratish
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<Lesson>>> {
    return await this.lessonService.findAll();
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.findOneById(id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateLessonDto: UpdateLessonDto,
  ): Promise<ResData<Lesson>> {
    return await this.lessonService.update(id, updateLessonDto);
  }
  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.delete(id);
  }
}
