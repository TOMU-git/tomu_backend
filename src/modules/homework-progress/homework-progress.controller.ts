import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HomeworkProgressService } from './homework-progress.service';
import { CreateHomeworkProgressDto } from './dto/create-homework-progress.dto';
import { UpdateHomeworkProgressDto } from './dto/update-homework-progress.dto';

@Controller('homework-progress')
export class HomeworkProgressController {
  constructor(private readonly homeworkProgressService: HomeworkProgressService) {}

  @Post()
  create(@Body() createHomeworkProgressDto: CreateHomeworkProgressDto) {
    return this.homeworkProgressService.create(createHomeworkProgressDto);
  }

  @Get()
  findAll() {
    return this.homeworkProgressService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.homeworkProgressService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHomeworkProgressDto: UpdateHomeworkProgressDto) {
    return this.homeworkProgressService.update(+id, updateHomeworkProgressDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.homeworkProgressService.remove(+id);
  }
}
