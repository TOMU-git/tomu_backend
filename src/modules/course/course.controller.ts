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
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ResData } from 'src/lib/resData';
import { Course } from './entities/course.entity';
import { ICourseService } from './interfaces/course.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('course')
@Controller('course')
export class CourseController {
  constructor(
    @Inject('ICourseService')
    private readonly courseService: ICourseService,
  ) {}

  @Post()
  async create(
    @Body() createCourseDto: CreateCourseDto,
  ): Promise<ResData<Course>> {
    return await this.courseService.create(createCourseDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Course>>> {
    return await this.courseService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<ResData<Course>> {
    return await this.courseService.update(id, updateCourseDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.delete(id);
  }
}
