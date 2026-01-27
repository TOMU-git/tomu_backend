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
import { addVimeoEmbedUrl, addVimeoEmbedUrlToArray, extractVimeoId, generateVimeoEmbedUrl } from "src/common/utils/helper";
import { getSubscriptionStatus } from "src/common/utils/subscription-helper";

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

    // videoUrl dan vimeoVideoId ni extract qilish
    const vimeoVideoId = dto.videoUrl ? extractVimeoId(dto.videoUrl) : null;

    Object.assign(newCourse, {
      ...dto,
      videoUrl: dto.videoUrl,
      vimeoVideoId,
      imageUrl,
      mimetype: file ? file.mimetype : null, // Fayl MIME turi
      size: file ? file.size : null, // Fayl o'lchami
    });

    const newData = await this.courseRepository.create(newCourse);
    return new ResData<Course>("Course created successfully", 201, addVimeoEmbedUrl(newData));
  }

  async findAll(user?: User): Promise<ResData<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }>>> {
    // Barcha kurslarni count va isActiveForUser bilan olish
    // Agar user mavjud bo'lsa, uning ID'sini uzatamiz
    const data = await this.courseRepository.findAllWithCounts(user?.id);

    // Vimeo embed URL qo'shamiz
    const dataWithVimeo = data.map(course => ({
      ...course,
      vimeoEmbedUrl: course.videoUrl ? generateVimeoEmbedUrl(course.videoUrl) : null,
    }));

    return new ResData<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }>>("ok", 200, dataWithVimeo);
  }

  async findOneById(id: ID, user?: User): Promise<ResData<Course & { isActiveForUser: boolean; subscriptionStatus: string; alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }>> {
    console.log('[CourseService.findOneById] START - Course ID:', id, 'User:', user ? `ID: ${user.id}` : 'NOT PROVIDED');

    // ID bo'yicha kursni count bilan topish
    const foundData = await this.courseRepository.findByIdWithCounts(id);
    if (!foundData) {
      console.log('[CourseService.findOneById] ERROR - Course not found with ID:', id);
      throw new CourseNotFoundException();
    }
    console.log('[CourseService.findOneById] Course found:', foundData.id, foundData.title);

    // Agar user mavjud bo'lsa, user uchun bu kurs mavjudligini tekshirish
    let isActiveForUser = false;
    let userCourse = null;
    if (user) {
      console.log('[CourseService.findOneById] Checking userCourse - User ID:', user.id, 'Course ID:', id);
      userCourse = await this.userCourseRepository.findByUserIdAndCourseId(
        user.id,
        id,
      );
      console.log('[CourseService.findOneById] userCourse result:', userCourse ? {
        id: userCourse.id,
        userId: userCourse.user?.id,
        courseId: userCourse.course?.id,
        isActive: userCourse.isActive,
        hasEverPaid: userCourse.hasEverPaid,
        endedAt: userCourse.endedAt
      } : 'NULL');

      // Faqat harid qilingan va aktiv obunani tekshirish
      if (userCourse &&
        userCourse.hasEverPaid &&
        userCourse.isActive &&
        (!userCourse.endedAt || userCourse.endedAt >= new Date())) {
        isActiveForUser = true;
        console.log('[CourseService.findOneById] Active subscription found, setting isActiveForUser = true');
      } else {
        console.log('[CourseService.findOneById] No active subscription, isActiveForUser remains false');
      }
    } else {
      console.log('[CourseService.findOneById] No user provided, isActiveForUser = false');
    }

    console.log('[CourseService.findOneById] FINAL - isActiveForUser:', isActiveForUser);

    // subscriptionStatus ni hisoblash
    const subscriptionStatus = getSubscriptionStatus(userCourse || null);
    console.log('[CourseService.findOneById] subscriptionStatus:', subscriptionStatus);

    // Response ga isActiveForUser va count ma'lumotlarini qo'shish
    // TypeORM entity ni plain object ga aylantirish (metadata muammosini oldini olish uchun)
    const responseData = {
      id: foundData.id,
      title: foundData.title,
      description: foundData.description,
      imageUrl: foundData.imageUrl,
      videoUrl: foundData.videoUrl,
      vimeoEmbedUrl: foundData.videoUrl ? generateVimeoEmbedUrl(foundData.videoUrl) : null,
      mimetype: foundData.mimetype,
      size: foundData.size,
      isActive: foundData.isActive,
      lang: foundData.lang,
      createdAt: foundData.createdAt,
      lastUpdatedAt: foundData.lastUpdatedAt,
      isActiveForUser,
      subscriptionStatus,
      alphabetCount: foundData.alphabetCount,
      lessonCount: foundData.lessonCount,
      grammarCount: foundData.grammarCount,
      homeworkCount: foundData.homeworkCount,
    } as Course & { isActiveForUser: boolean; subscriptionStatus: string; vimeoEmbedUrl?: string; alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number };

    return new ResData<Course & { isActiveForUser: boolean; subscriptionStatus: string; alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }>("ok", 200, responseData);
  }

  async update(
    id: ID,
    updateCourseDto: UpdateCourseDto,
    file?: Express.Multer.File,
  ): Promise<ResData<Partial<Course> & { vimeoEmbedUrl?: string }>> {
    // Kursni topish
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }

    // Agar yangi fayl kelgan bo‘lsa, eski faylni o‘chirish
    if (file && foundData.imageUrl) {
      try {
        await this.fileService.removeByImageUrl(foundData.imageUrl);
      } catch (error) {
        console.error("Error occurred while deleting the file:", error.message);
        throw new Error("Faylni o'chirishda xato yuz berdi.");
      }
    }

    // Yangi faylni saqlash
    if (file) {
      const savedFile = await this.fileService.create(file);
      foundData.imageUrl = savedFile.data.path;
    }

    // PATCH logika: faqat haqiqiy qiymat kelganda update qilamiz
    if (updateCourseDto.title !== undefined && updateCourseDto.title !== null && updateCourseDto.title.trim() !== "") {
      foundData.title = updateCourseDto.title;
    }

    if (updateCourseDto.description !== undefined && updateCourseDto.description !== null && updateCourseDto.description.trim() !== "") {
      foundData.description = updateCourseDto.description;
    }

    if (updateCourseDto.videoUrl !== undefined && updateCourseDto.videoUrl !== null && updateCourseDto.videoUrl.trim() !== "") {
      foundData.videoUrl = updateCourseDto.videoUrl;
      // videoUrl dan vimeoVideoId ni extract qilish
      foundData.vimeoVideoId = extractVimeoId(updateCourseDto.videoUrl);
    }

    if (updateCourseDto.lang !== undefined && updateCourseDto.lang !== null && updateCourseDto.lang.trim() !== "") {
      foundData.lang = updateCourseDto.lang;
    }


    // isActive faqat agar kelgan bo‘lsa update qilinadi
    if (updateCourseDto.isActive !== undefined && updateCourseDto.isActive !== null) {
      foundData.isActive = updateCourseDto.isActive;
    }

    // Kursni yangilash DB da
    const data = await this.courseRepository.update(foundData);

    // Faqat yangilangan ma’lumotlarni qaytarish
    return new ResData<Partial<Course> & { vimeoEmbedUrl?: string }>(
      "Course updated successfully",
      200,
      {
        title: data.title,
        description: data.description,
        videoUrl: data.videoUrl,
        vimeoEmbedUrl: data.videoUrl ? generateVimeoEmbedUrl(data.videoUrl) : null,
        imageUrl: data.imageUrl,
        lang: data.lang,
        isActive: data.isActive,
      }
    );
  }


  async delete(id: ID): Promise<ResData<Course>> {
    // update va delete metodlarida faqat kurs mavjudligini tekshirish kerak,
    // shuning uchun to'g'ridan-to'g'ri repository dan olamiz
    const foundData = await this.courseRepository.findById(id);
    if (!foundData) {
      throw new CourseNotFoundException();
    }
    const data = await this.courseRepository.delete(foundData);
    return new ResData<Course>("Course deleted successfully", 200, addVimeoEmbedUrl(data));
  }
}
