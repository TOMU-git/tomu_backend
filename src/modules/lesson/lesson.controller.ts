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
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { ResData } from 'src/lib/resData';
import { Lesson } from './entities/lesson.entity';
import { ILessonService } from './interfaces/lesson.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('lesson')
@Controller('lesson')
export class LessonController {
  constructor(
    @Inject('ILessonService')
    private readonly lessonService: ILessonService,
  ) {}

  @Post()
  async create(
    @Body() createLessonDto: CreateLessonDto,
  ): Promise<ResData<Lesson>> {
    return await this.lessonService.create(createLessonDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Lesson>>> {
    return await this.lessonService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateLessonDto: UpdateLessonDto,
  ): Promise<ResData<Lesson>> {
    return await this.lessonService.update(id, updateLessonDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Lesson>> {
    return await this.lessonService.delete(id);
  }
}
