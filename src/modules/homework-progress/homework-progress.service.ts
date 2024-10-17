import { Injectable } from '@nestjs/common';
import { CreateHomeworkProgressDto } from './dto/create-homework-progress.dto';
import { UpdateHomeworkProgressDto } from './dto/update-homework-progress.dto';

@Injectable()
export class HomeworkProgressService {
  create(createHomeworkProgressDto: CreateHomeworkProgressDto) {
    return 'This action adds a new homeworkProgress';
  }

  findAll() {
    return `This action returns all homeworkProgress`;
  }

  findOne(id: number) {
    return `This action returns a #${id} homeworkProgress`;
  }

  update(id: number, updateHomeworkProgressDto: UpdateHomeworkProgressDto) {
    return `This action updates a #${id} homeworkProgress`;
  }

  remove(id: number) {
    return `This action removes a #${id} homeworkProgress`;
  }
}
