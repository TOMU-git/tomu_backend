import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateLessonProgressDto } from './dto/create-lesson-progress.dto';
import { ResData } from 'src/lib/resData';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ILessonProgressService } from './interfaces/lesson-progress.service';
import { ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorator/auth.decorator';
import { RoleEnum } from 'src/common/enums/enum';

@ApiTags('lesson-progress')
@Controller('lesson-progress')
export class LessonProgressController {
  constructor(
    @Inject('ILessonProgressService')
    private readonly lessonProgressService: ILessonProgressService,
  ) {}

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Post()
  async create(
    @Body() createLessonProgressDto: CreateLessonProgressDto,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.create(createLessonProgressDto);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get()
  async findAll(): Promise<ResData<Array<LessonProgress>>> {
    return await this.lessonProgressService.findAll();
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: ID,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.findOneById(id);
  }
}
