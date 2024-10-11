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
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ResData } from 'src/lib/resData';
import { Course } from './entities/course.entity';
import { ICourseService } from './interfaces/course.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { Roles } from '../auth/decorator/role.decorator';
import { RoleEnum } from 'src/common/enums/enum';

@ApiTags('course')
@Controller('course')
export class CourseController {
  constructor(
    @Inject('ICourseService')
    private readonly courseService: ICourseService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
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

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<ResData<Course>> {
    return await this.courseService.update(id, updateCourseDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.delete(id);
  }
}
