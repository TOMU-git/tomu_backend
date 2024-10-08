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
import { CreateUserCourseDto } from './dto/create-user-course.dto';
import { UpdateUserCourseDto } from './dto/update-user-course.dto';
import { ResData } from 'src/lib/resData';
import { UserCourse } from './entities/user-course.entity';
import { IUserCourseService } from './interfaces/user-course.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('user-course')
@Controller('user-course')
export class UserCoursesController {
  constructor(
    @Inject('IUserCourseService')
    private readonly userCourseService: IUserCourseService,
  ) {}

  @Post()
  async create(
    @Body() createUserCourseDto: CreateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.create(createUserCourseDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<UserCourse>>> {
    return await this.userCourseService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: ID,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateUserCourseDto: UpdateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.update(id, updateUserCourseDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: ID,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.delete(id);
  }
}
