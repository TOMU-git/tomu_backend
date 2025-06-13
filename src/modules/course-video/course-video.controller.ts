import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  Inject,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import { ResData } from 'src/lib/resData';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileOption } from 'src/lib/file';
import { Auth } from 'src/common/decorator/auth.decorator';
import { RoleEnum } from 'src/common/enums/enum';
import { CourseVideo } from './entities/course-video.entity';
import { ICourseVideoService } from './interfaces/course-video.service';

@ApiTags('course-video')
@Controller('course-video')
export class CourseVideoController {
  constructor(
    @Inject('ICourseVideoService')
    private readonly courseVideoService: ICourseVideoService,
  ) {}

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('video'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async create(
    @UploadedFile() video: Express.Multer.File,
  ): Promise<ResData<CourseVideo>> {
    if (!video) {
      throw new BadRequestException('Fayl yuklanmadi');
    }
    return await this.courseVideoService.create(video);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get()
  async findAll(): Promise<ResData<Array<CourseVideo>>> {
    return await this.courseVideoService.findAll();
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResData<CourseVideo>> {
    return await this.courseVideoService.delete(id);
  }
}
