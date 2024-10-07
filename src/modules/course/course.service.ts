import { Inject, Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './entities/course.entity';
import { ICourseRepository } from './interfaces/course.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { ICourseService } from './interfaces/course.service';
import {
  CourseAlreadyExistException,
  CourseNotFoundException,
} from './exception/course.exception';

@Injectable()
export class CourseService implements ICourseService {
  constructor(
    @Inject('ICourseRepository')
    private readonly courseRepository: ICourseRepository,
  ) {}

  async create(createCourseDto: CreateCourseDto): Promise<ResData<Course>> {
    const foundData = await this.courseRepository.findOneByName(
      createCourseDto.title,
    );
    if (!foundData) {
      throw new CourseAlreadyExistException();
    }
    let newCourse = new Course();
    newCourse = Object.assign(newCourse, createCourseDto);
    const newData = await this.courseRepository.create(newCourse);

    return new ResData<Course>('Course created successfully', 201, newData);
  }

  async findAll(): Promise<ResData<Array<Course>>> {
    const data = await this.courseRepository.findAll();

    return new ResData<Array<Course>>('ok', 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Course>> {
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }

    return new ResData<Course>('ok', 200, foundData);
  }

  async update(
    id: ID,
    updateCourseDto: UpdateCourseDto,
  ): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);
    const updatedData = Object.assign(foundData, updateCourseDto);
    const data = await this.courseRepository.update(updatedData);

    return new ResData<Course>('Course updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.courseRepository.delete(foundData);

    return new ResData<Course>('Course deleted successfully', 200, data);
  }
}
