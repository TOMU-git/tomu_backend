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
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { ResData } from 'src/lib/resData';
import { Homework } from './entities/homework.entity';
import { IHomeworkService } from './interfaces/homework.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('homework')
@Controller('homework')
export class HomeworkController {
  constructor(
    @Inject('IHomeworkService')
    private readonly homeworkService: IHomeworkService,
  ) {}

  @Post()
  async create(
    @Body() createHomeworkDto: CreateHomeworkDto,
  ): Promise<ResData<Homework>> {
    return await this.homeworkService.create(createHomeworkDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Homework>>> {
    return await this.homeworkService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Homework>> {
    return await this.homeworkService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateHomeworkDto: UpdateHomeworkDto,
  ): Promise<ResData<Homework>> {
    return await this.homeworkService.update(id, updateHomeworkDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Homework>> {
    return await this.homeworkService.delete(id);
  }
}
