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
import { User } from "../user/entities/user.entity";
import { IUserCourseRepository } from "../user-courses/interfaces/user-course.repository";

@Injectable()
export class CourseService implements ICourseService {
  constructor(
    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,

    @Inject("IFileService")
    private readonly fileService: IFileService,

    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,
  ) { }

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

  async findOneById(id: ID, user?: User): Promise<ResData<Course & { isActiveForUser: boolean }>> {
    console.log('[CourseService.findOneById] START - Course ID:', id, 'User:', user ? `ID: ${user.id}` : 'NOT PROVIDED');
    
    // ID bo'yicha kursni topish
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      console.log('[CourseService.findOneById] ERROR - Course not found with ID:', id);
      throw new CourseNotFoundException();
    }
    console.log('[CourseService.findOneById] Course found:', foundData.id, foundData.title);

    // Agar user mavjud bo'lsa, user uchun bu kurs mavjudligini tekshirish
    let isActiveForUser = false;
    if (user) {
      console.log('[CourseService.findOneById] Checking userCourse - User ID:', user.id, 'Course ID:', id);
      const userCourse = await this.userCourseRepository.findByUserIdAndCourseId(
        user.id,
        id,
      );
      console.log('[CourseService.findOneById] userCourse result:', userCourse ? {
        id: userCourse.id,
        userId: userCourse.user?.id,
        courseId: userCourse.course?.id,
        isActive: userCourse.isActive,
        status: userCourse.status
      } : 'NULL');
      
      // Agar userCourse topilsa (ya'ni user bu kursga ega bo'lsa), isActiveForUser = true
      if (userCourse) {
        isActiveForUser = true;
        console.log('[CourseService.findOneById] userCourse found, setting isActiveForUser = true');
      } else {
        console.log('[CourseService.findOneById] userCourse NOT found, isActiveForUser remains false');
      }
    } else {
      console.log('[CourseService.findOneById] No user provided, isActiveForUser = false');
    }

    console.log('[CourseService.findOneById] FINAL - isActiveForUser:', isActiveForUser);

    // Response ga isActiveForUser qo'shish
    // TypeORM entity ni plain object ga aylantirish (metadata muammosini oldini olish uchun)
    const responseData = {
      id: foundData.id,
      title: foundData.title,
      description: foundData.description,
      imageUrl: foundData.imageUrl,
      videoUrl: foundData.videoUrl,
      mimetype: foundData.mimetype,
      size: foundData.size,
      isActive: foundData.isActive,
      lang: foundData.lang,
      createdAt: foundData.createdAt,
      lastUpdatedAt: foundData.lastUpdatedAt,
      isActiveForUser,
    } as Course & { isActiveForUser: boolean };

    return new ResData<Course & { isActiveForUser: boolean }>("ok", 200, responseData);
  }

  async update(
    id: ID,
    updateCourseDto: UpdateCourseDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Partial<Course>>> {
    // update va delete metodlarida faqat kurs mavjudligini tekshirish kerak,
    // shuning uchun to'g'ridan-to'g'ri repository dan olamiz
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }
    // Eski faylni o'chirish agar yangi fayl yuklangan bo'lsa
    if (file && foundData.imageUrl) {
      try {
        // Fayl mavjudligini tekshirish va o'chirish
        await this.fileService.removeByImageUrl(
          foundData.imageUrl,
        );
      } catch (error) {
        console.error("Error occurred while deleting the file:", error.message);
        throw new Error("Faylni o'chirishda xato yuz berdi.");
      }
    }

    foundData.isActive = updateCourseDto.isActive;

    // Yangi faylni saqlash
    if (file) {
      const savedFile = await this.fileService.create(file);
      foundData.imageUrl = savedFile.data.path;
    }


    if (updateCourseDto.description !== "") {
      foundData.description = updateCourseDto.description;
    }

    if (updateCourseDto.title !== "") {
      foundData.title = updateCourseDto.title;
    }

    if (updateCourseDto.videoUrl !== "") {
      foundData.videoUrl = updateCourseDto.videoUrl;
    }

    if (updateCourseDto.lang !== undefined && updateCourseDto.lang !== null) {
      foundData.lang = updateCourseDto.lang;
    }

    foundData.isActive = updateCourseDto.isActive;
    // Yangilangan ma'lumotlarni birlashtirish

    // Kursni yangilash
    const data = await this.courseRepository.update(foundData);

    // Faqat yangilangan ma'lumotlarni qaytaramiz
    return new ResData<Partial<Course>>("Course updated successfully", 200, {
      title: data.title,
      description: data.description,
      videoUrl: data.videoUrl,
      imageUrl: data.imageUrl,
      lang: data.lang,
    });
  }

  async delete(id: ID): Promise<ResData<Course>> {
    // update va delete metodlarida faqat kurs mavjudligini tekshirish kerak,
    // shuning uchun to'g'ridan-to'g'ri repository dan olamiz
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }
    const data = await this.courseRepository.delete(foundData);
    return new ResData<Course>("Course deleted successfully", 200, data);
  }
}
