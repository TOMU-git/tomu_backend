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
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ResData } from 'src/lib/resData';
import { Lesson } from './entities/lesson.entity';
import { ILessonService } from './interfaces/lesson.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { RoleEnum } from 'src/common/enums/enum';
import { Roles } from '../auth/decorator/role.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileOption } from 'src/lib/file';
import { Request, request } from 'express';

@ApiTags('lesson')
@Controller('lesson')
export class LessonController {
  constructor(
    @Inject('ILessonService')
    private readonly lessonService: ILessonService,
  ) {}

  @Post('video')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload video file',
    type: 'multipart/form-data', // You can specify the content type if needed
    // Specify the file property here
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary', // Indicates that this is a file upload
        },
      },
      required: ['file'], // Specify required fields
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    
    console.log(file);
    return {
      message: 'Video uploaded successfully!',
      filename: file.originalname,
    };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<Lesson>>> {
    return await this.lessonService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateLessonDto: UpdateLessonDto,
  ): Promise<ResData<Lesson>> {
    return await this.lessonService.update(id, updateLessonDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.delete(id);
  }
}
