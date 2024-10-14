import { Inject, Injectable } from '@nestjs/common';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { ICourseRepository } from './interfaces/course.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { ICourseService } from './interfaces/course.service';
import {
  CourseAlreadyExistException,
  CourseNotFoundException,
} from './exception/course.exception';
import { IFileService } from '../file/interfaces/file.service';
import { CreateFileDto } from '../file/dto/create-file.dto';
import { Course } from './entities/course.entity';

@Injectable()
export class CourseService implements ICourseService {
  constructor(
    @Inject('ICourseRepository')
    private readonly courseRepository: ICourseRepository,

    @Inject('IFileService')
    private readonly fileService: IFileService,
  ) {}

  async create(
    dto: CreateCourseDto,
    file?: Express.Multer.File, // Fayl ixtiyoriy
  ): Promise<ResData<Course>> {
    console.log(dto);
    console.log(file);
    const foundData = await this.courseRepository.findOneByName(dto.title);
    if (foundData) {
      throw new CourseAlreadyExistException();
    }

    let newCourse = new Course();

    // Fayl yuklash jarayoni
    if (file) {
      const fileDto = new CreateFileDto();
      const savedFile = await this.fileService.create(
        Object.assign(fileDto, {
          originalname: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        }),
      );
      // Fayl muvaffaqiyatli yuklangan bo'lsa, imageUrl sifatida kursga qo'shamiz
      newCourse = Object.assign(newCourse, dto, {
        imageUrl: savedFile.data.path,
      });
    } else {
      newCourse = Object.assign(newCourse, dto);
    }

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
    file?: Express.Multer.File, // Fayl ixtiyoriy
  ): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);

    // Eski faylni o'chirish agar mavjud bo'lsa va yangi fayl yuklangan bo'lsa
    if (file && foundData.imageUrl) {
      await this.fileService.removeByImageUrl(foundData.imageUrl);
    }

    // Yangi faylni yuklash va imageUrl ni yangilash
    if (file) {
      const fileDto = new CreateFileDto();
      const savedFile = await this.fileService.create(
        Object.assign(fileDto, {
          originalname: file.originalname,
          path: file.path,
          mimetype: file.mimetype,
          size: file.size,
        }),
      );
      updateCourseDto = Object.assign(updateCourseDto, {
        imageUrl: savedFile.data.path,
      });
    }

    const updatedData = Object.assign(foundData, updateCourseDto);
    const data = await this.courseRepository.update(updatedData);

    return new ResData<Course>('Course updated successfully', 200, data);
  }

  async delete(id: ID): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);
    console.log(foundData);
    // Eski faylni o'chirish agar mavjud bo'lsa
    if (foundData.imageUrl) {
      await this.fileService.removeByImageUrl(foundData.imageUrl);
    }

    const data = await this.courseRepository.delete(foundData);

    return new ResData<Course>('Course deleted successfully', 200, data);
  }
}
