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
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ResData } from 'src/lib/resData';
import { ICourseService } from './interfaces/course.service';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { fileOption } from 'src/lib/file';
import { Auth } from 'src/common/decorator/auth.decorator';
import { Course } from './entities/course.entity';

@ApiTags('course')
@Controller('course')
export class CourseController {
  constructor(
    @Inject('ICourseService')
    private readonly courseService: ICourseService,
  ) {}

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Post('upload')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'fileName', maxCount: 1 },
      { name: 'video', maxCount: 1 },
    ]),
  )
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Introduction to Programming' },
        description: {
          type: 'string',
          example: 'This course covers the basics of programming using Python.',
        },
        fileName: {
          type: 'string',
          format: 'binary',
        },
        video: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data') // Swagger'da fayl yuklashni ko'rsatish uchun
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFiles()
    files: { fileName?: Express.Multer.File[]; video?: Express.Multer.File[] }, // Faylni qabul qilish
  ): Promise<ResData<Course>> {
    const file = files.fileName ? files.fileName[0] : null; // fileName faylini olish
    const video = files.video ? files.video[0] : null; // video faylini olish
    console.log("ishladi")

    return await this.courseService.create(createCourseDto, file, video);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Course>>> {
    return await this.courseService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.findOneById(id);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Patch(':id')
  @UseInterceptors(FileInterceptor('fileName', fileOption))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Introduction to Programming' },
        description: {
          type: 'string',
          example: 'This course covers the basics of programming using Python.',
        },
        fileName: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data') // Swagger'da fayl yuklashni ko'rsatish uchun
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @UploadedFile() file: Express.Multer.File, // Faylni qabul qilish
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<ResData<Course>> {
    return await this.courseService.update(id, updateCourseDto, file);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.delete(id);
  }
}
