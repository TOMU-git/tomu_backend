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
import { CreateLessonProgressDto } from './dto/create-lesson-progress.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import { ResData } from 'src/lib/resData';
import { LessonProgress } from './entities/lesson-progress.entity';
import { ILessonProgressService } from './interfaces/lesson-progress.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Auth } from 'src/common/decorator/auth.decorator';
import { RoleEnum } from 'src/common/enums/enum';
import { RolesGuard } from '../shared/guards/role.guard';
import { AuthGuard } from '../shared/guards/auth.guard';
import { Roles } from '../auth/decorator/role.decorator';

@ApiTags('lesson-progress')
@Controller('lesson-progress')
export class LessonProgressController {
  constructor(
    @Inject('ILessonProgressService')
    private readonly lessonProgressService: ILessonProgressService,
  ) {}


  @Post()
  async create(
    @Body() createLessonProgressDto: CreateLessonProgressDto,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.create(createLessonProgressDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<LessonProgress>>> {
    return await this.lessonProgressService.findAll();
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: ID,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateLessonProgressDto: UpdateLessonProgressDto,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.update(id, updateLessonProgressDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: ID,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.delete(id);
  }
}
