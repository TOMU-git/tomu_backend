import { Injectable, Inject } from '@nestjs/common';
import { ILessonProgressService } from './interfaces/lesson-progress.service';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { LessonProgress } from './entities/lesson-progress.entity';
import { CreateLessonProgressDto } from './dto/create-lesson-progress.dto';
import { UpdateLessonProgressDto } from './dto/update-lesson-progress.dto';
import {
  LessonProgressAlreadyExistException,
  LessonProgressNotFoundException,
} from './exception/lesson-progress.exception';
import { ILessonProgressRepository } from './interfaces/lesson-progress.repository';
import { IUserService } from '../user/interfaces/user.service';
import { ILessonService } from '../lesson/interfaces/lesson.service';


@Injectable()
export class LessonProgressService implements ILessonProgressService {
  constructor(
    @Inject('ILessonProgressRepository')
    private readonly lessonProgressRepository: ILessonProgressRepository,

    @Inject('IUserService') // UserService ni inject qilamiz
    private readonly userService: IUserService,

    @Inject('ILessonService') // LessonService ni inject qilamiz
    private readonly lessonService: ILessonService,
  ) {}

  async create(dto: CreateLessonProgressDto): Promise<ResData<LessonProgress>> {
    console.log(
      'Creating lesson progress with userId:',
      dto.userId,
      'and lessonId:',
      dto.lessonId,
    );

    // User va lesson mavjudligini tekshirish
    const foundUser = await this.userService.findOneById(dto.userId); // UserService orqali foydalanuvchini topamiz
    const foundLesson = await this.lessonService.findOneById(dto.lessonId); // LessonService orqali darsni topamiz


    // Darsning foydalanuvchiga bog'langan yozuvi borligini tekshirish
    const foundData =
      await this.lessonProgressRepository.findOneByUserAndLesson(
        dto.userId,
        dto.lessonId,
      );
    console.log('foundData', foundData);
    if (foundData) {
      throw new LessonProgressAlreadyExistException();
    }

    let newLessonProgress = new LessonProgress();
    newLessonProgress = Object.assign(newLessonProgress, dto);
    const newData =
      await this.lessonProgressRepository.create(newLessonProgress);
    console.log('newData:', newData);

    return new ResData<LessonProgress>(
      'Lesson progress created successfully',
      201,
      newData,
    );
  }

  async findAll(): Promise<ResData<Array<LessonProgress>>> {
    const data = await this.lessonProgressRepository.findAll();

    return new ResData<Array<LessonProgress>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<LessonProgress>> {
    const foundData = await this.lessonProgressRepository.findById(id);
    if (!foundData) {
      throw new LessonProgressNotFoundException();
    }

    return new ResData<LessonProgress>('ok', 200, foundData);
  }

  async update(
    id: ID,
    dto: UpdateLessonProgressDto,
  ): Promise<ResData<LessonProgress>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, dto);
    const data = await this.lessonProgressRepository.update(updatedData);

    return new ResData<LessonProgress>(
      'Lesson progress updated successfully',
      200,
      data,
    );
  }

  async delete(id: ID): Promise<ResData<LessonProgress>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.lessonProgressRepository.delete(foundData);

    return new ResData<LessonProgress>(
      'Lesson progress deleted successfully',
      200,
      data,
    );
  }
}
