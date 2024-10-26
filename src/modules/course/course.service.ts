import { Inject, Injectable } from "@nestjs/common";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { ICourseRepository } from "./interfaces/course.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { ICourseService } from "./interfaces/course.service";
import {
  CourseAlreadyExistException,
  CourseNotFoundException,
} from "./exception/course.exception";
import { IFileService } from "../file/interfaces/file.service";
import { Course } from "./entities/course.entity";

@Injectable()
export class CourseService implements ICourseService {
  constructor(
    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,

    @Inject("IFileService")
    private readonly fileService: IFileService,
  ) {}

  async create(
    dto: CreateCourseDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Course>> {
    // Yangi kurs mavjudligini tekshirish
    const foundData = await this.courseRepository.findOneByName(dto.title);
    if (foundData) {
      throw new CourseAlreadyExistException();
    }

    // Faylni saqlash
    let imageUrl = null;
    if (file) {
      const image = await this.fileService.create(file);
      imageUrl = image.data.path; // Fayl manzilini saqlash
    }

    // Yangi kurs ob'ektini yaratish
    const newCourse = new Course();
    Object.assign(newCourse, {
      ...dto,
      videoUrl: dto.videoUrl,
      imageUrl,
      mimetype: file ? file.mimetype : null, // Fayl MIME turi
      size: file ? file.size : null, // Fayl o'lchami
    });

    const newData = await this.courseRepository.create(newCourse);
    return new ResData<Course>("Course created successfully", 201, newData);
  }

  async findAll(): Promise<ResData<Array<Course>>> {
    // Barcha kurslarni olish
    const data = await this.courseRepository.findAll();

    return new ResData<Array<Course>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Course>> {
    // ID bo'yicha kursni topish
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }

    return new ResData<Course>("ok", 200, foundData);
  }

  async update(
    id: ID,
    updateCourseDto: UpdateCourseDto,
    file?: Express.Multer.File, // Fayl ixtiyoriy
  ): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);

    // Eski faylni o'chirish agar mavjud bo'lsa va yangi fayl yuklangan bo'lsa
    if (file && foundData.imageUrl) {
      try {
        const removeResult = await this.fileService.removeByImageUrl(
          foundData.imageUrl,
        );
        if (!removeResult) {
          console.log("Fayl topilmadi yoki o‘chirilmadi.");
        }
      } catch (error) {
        console.error("Error occurred while deleting the file:", error);
        throw new Error("An error occurred while deleting the file.");
      }
    }

    // Yangi faylni yuklash va imageUrl ni yangilash
    if (file) {
      const savedFile = await this.fileService.create(file);
      updateCourseDto = Object.assign(updateCourseDto, {
        imageUrl: savedFile.data.path,
      });
    }

    // Kurs ma'lumotlarini yangilash uchun eski ma'lumotlarni yangilangan DTO bilan birlashtirish
    const updatedData = Object.assign(foundData, updateCourseDto);

    // Kursni yangilash
    const data = await this.courseRepository.update(updatedData);

    return new ResData<Course>("Course updated successfully", 200, data);
  }

  async delete(id: ID): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);
    // Eski faylni o'chirish agar mavjud bo'lsa
    if (foundData.imageUrl) {
      try {
        await this.fileService.removeByImageUrl(foundData.imageUrl);
      } catch (error) {
        console.error("Error occurred while deleting the file:", error);
        throw new Error("An error occurred while deleting the file.");
      }
    }

    // Kursni o'chirish
    const data = await this.courseRepository.delete(foundData);

    return new ResData<Course>("Course deleted successfully", 200, data);
  }
}
