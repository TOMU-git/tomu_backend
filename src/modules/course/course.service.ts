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
    file?: Express.Multer.File,
  ): Promise<ResData<Partial<Course>>> {
    const { data: foundData } = await this.findOneById(id);
    // // Eski faylni o'chirish agar yangi fayl yuklangan bo'lsa
    // if (file && foundData.imageUrl) {
    //   try {
    //     // Fayl mavjudligini tekshirish va o'chirish
    //     const removeResult = await this.fileService.removeByImageUrl(
    //       foundData.imageUrl,
    //     );
    //     if (!removeResult) {
    //       console.log("File not found");
    //     }
    //   } catch (error) {
    //     console.error("Error occurred while deleting the file:", error.message);
    //     throw new Error("Faylni o'chirishda xato yuz berdi.");
    //   }
    // }

    foundData.isActive = updateCourseDto.isActive;

    // Yangi faylni saqlash
    if (file) {
      const savedFile = await this.fileService.create(file);
      foundData.imageUrl = savedFile.data.path;
    }

    // Yangilanish ma'lumotlari
    const updateData: Partial<Course> = {};

    if (updateCourseDto.description !== "") {
      updateData.description = updateCourseDto.description;
    }

    if (updateCourseDto.title !== "") {
      updateData.title = updateCourseDto.title;
    }

    if (updateCourseDto.videoUrl !== "") {
      updateData.videoUrl = updateCourseDto.videoUrl;
    }

    // Yangilangan ma'lumotlarni birlashtirish
    const updatedData = Object.assign(foundData, updateData);

    // Kursni yangilash
    const data = await this.courseRepository.update(updatedData);

    // Faqat yangilangan ma'lumotlarni qaytaramiz
    return new ResData<Partial<Course>>("Course updated successfully", 200, {
      title: data.title,
      description: data.description,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl,
    });
  }

  async delete(id: ID): Promise<ResData<Course>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.courseRepository.delete(foundData);
    return new ResData<Course>("Course deleted successfully", 200, data);
  }
}
