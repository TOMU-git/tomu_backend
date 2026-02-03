import { Inject, Injectable } from "@nestjs/common";
import { CreateUserCourseDto } from "./dto/create-user-course.dto";
import { UpdateUserCourseDto } from "./dto/update-user-course.dto";
import { UserCourse } from "./entities/user-course.entity";
import { IUserCourseRepository } from "./interfaces/user-course.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IUserCourseService, UserCourseWithCounts } from "./interfaces/user-course.service";
import { UserCourseAlreadyExistException, UserCourseNotFoundException } from "./exception/user-course.exception";
import { ICourseRepository } from "../course/interfaces/course.repository";
import { CourseNotFoundException } from "../course/exception/course.exception";
import { IUserRepository } from "../user/interfaces/user.repository";
import { UserNotFound } from "../user/exception/user.exception";
import { getSubscriptionStatus } from "src/common/utils/subscription-helper";

@Injectable()
export class UserCourseService implements IUserCourseService {
  constructor(
    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,

    @Inject("IUserRepository")
    private readonly userRepository: IUserRepository,

    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,
  ) { }

  /**
   * Yangi UserCourse yaratadi.
   * User va kurs ID'lari mavjudligini tekshiradi, agar topilmasa, xato chiqaradi.
   * @param createUserCourseDto Yangi UserCourse uchun ma'lumotlar
   * @returns UserCourse muvaffaqiyatli yaratilgani haqida ma'lumot
   */
  async create(
    createUserCourseDto: CreateUserCourseDto,
  ): Promise<ResData<Partial<UserCourse>>> {
    const foundUser = await this.userRepository.findOneById(
      createUserCourseDto.userId,
    );
    if (!foundUser) {
      throw new UserNotFound();
    }

    const foundCourse = await this.courseRepository.findById(
      createUserCourseDto.courseId,
    );
    if (!foundCourse) {
      throw new CourseNotFoundException();
    }

    const foundUserCourse = await this.userCourseRepository.findByUserIdAndCourseId(
      createUserCourseDto.userId,
      createUserCourseDto.courseId,
    );
    if (foundUserCourse) {
      throw new UserCourseAlreadyExistException();
    }

    let newUserCourse = new UserCourse();
    newUserCourse.course = foundCourse;
    newUserCourse.user = foundUser;
    newUserCourse = Object.assign(newUserCourse, createUserCourseDto);

    // Bepul sinov uchun endedAt qo'shilmaydi, faqat to'lov qilinganda qo'shiladi
    if (!createUserCourseDto.onFreeTrial) {
      // To'lov qilingan holatda endedAt o'rnatiladi (agar kerak bo'lsa)
      // Bu yerda endedAt o'rnatish logikasi qo'shilishi mumkin
      // Hozircha endedAt null qoladi, to'lov qilinganda transactions.service.ts da o'rnatiladi
    }

    const newData = await this.userCourseRepository.create(newUserCourse);

    return new ResData<Partial<UserCourse>>(
      "User Course created successfully",
      201,
      {
        id: newData.id,
        status: newData.status,
      },
    );
  }

  async findByDate(userId: number, day: Date, courseId: number): Promise<ResData<{ isActive: boolean, hasEverPaid: boolean }>> {
    const foundUserCourse = await this.userCourseRepository.findByUserIdAndCourseId(userId, courseId);
    if (!foundUserCourse) {
      throw new UserCourseNotFoundException();
    }
    if (foundUserCourse.endedAt < day) {
      foundUserCourse.isActive = false;
      // foydalanuvchini obunasi tugaganda isActive false qilinadi
      await this.userCourseRepository.update(foundUserCourse);
    }
    return new ResData<{ isActive: boolean, hasEverPaid: boolean }>("User course", 200, { isActive: foundUserCourse.isActive, hasEverPaid: foundUserCourse.hasEverPaid });
  }

  /**
   * Hamma UserCourse-larni oladi.
   * @returns Hamma UserCourse-lar ro'yxati
   */
  async findAll(): Promise<ResData<Array<UserCourse>>> {
    const data = await this.userCourseRepository.findAll();
    return new ResData<Array<UserCourse>>("ok", 200, data);
  }

  /**
   * Berilgan ID bo'yicha UserCourse-ni topadi.
   * Agar ma'lumot topilmasa, xato chiqaradi.
   * @param id UserCourse ID'si
   * @returns Topilgan UserCourse
   */
  async findOneById(id: ID): Promise<ResData<UserCourse>> {
    const foundData = await this.userCourseRepository.findById(id);
    if (!foundData) {
      throw new UserCourseNotFoundException();
    }
    return new ResData<UserCourse>("ok", 200, foundData);
  }

  async findOneByUserId(id: ID): Promise<ResData<Array<UserCourseWithCounts>>> {
    const foundData = await this.userCourseRepository.findByUserId(id);
    if (!foundData) {
      throw new UserCourseNotFoundException();
    }

    // Har bir course uchun count ma'lumotlarini qo'shamiz
    const enrichedData = await Promise.all(
      foundData.map(async (userCourse) => {
        // subscriptionStatus ni hisoblash
        const subscriptionStatus = getSubscriptionStatus(userCourse);

        if (userCourse.course && userCourse.course.id) {
          // Course uchun count ma'lumotlarini olamiz
          const courseWithCounts = await this.courseRepository.findByIdWithCounts(
            userCourse.course.id,
          );

          if (courseWithCounts) {
            // Course object'ga count'larni qo'shamiz
            return {
              ...userCourse,
              subscriptionStatus,
              course: {
                ...userCourse.course,
                alphabetCount: courseWithCounts.alphabetCount,
                lessonCount: courseWithCounts.lessonCount,
                grammarCount: courseWithCounts.grammarCount,
                homeworkCount: courseWithCounts.homeworkCount,
              },
            };
          }
        }
        // Agar course yo'q bo'lsa yoki count olinmasa, original data qaytaramiz
        return {
          ...userCourse,
          subscriptionStatus,
        };
      }),
    );

    return new ResData<Array<UserCourseWithCounts>>("ok", 200, enrichedData as Array<UserCourseWithCounts>);
  }

  /**
   * UserCourse-ni yangilaydi.
   * Berilgan ID bo'yicha mavjud UserCourse-ni topadi va uni yangilaydi.
   * @param id UserCourse ID'si
   * @param updateUserCourseDto Yangilangan UserCourse ma'lumotlari
   * @returns Yangilangan UserCourse haqida ma'lumot
   */
  async update(
    id: ID,
    updateUserCourseDto: UpdateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    // ID bo'yicha mavjud UserCourse-ni topish uchun findOneById metodini chaqiramiz
    const foundData = await this.findOneById(id);

    // Object.assign yordamida foundData.data va updateUserCourseDto obyektlarini birlashtiramiz
    // Bu yerda eski UserCourse ma'lumotlari yangilanadi
    const updatedData = Object.assign(foundData.data, updateUserCourseDto);

    // Yangilangan UserCourse-ni userCourseRepository orqali saqlaymiz
    const data = await this.userCourseRepository.update(updatedData);

    // Yangilangan UserCourse haqida muvaffaqiyatli javob qaytaramiz
    return new ResData<UserCourse>(
      "User Course updated successfully",
      200,
      data,
    );
  }

  /**
   * UserCourse-ni o'chiradi.
   * Berilgan ID bo'yicha UserCourse-ni topadi va o'chiradi.
   * @param id UserCourse ID'si
   * @returns O'chirilgan UserCourse haqida ma'lumot
   */
  async delete(id: ID): Promise<ResData<UserCourse>> {
    const foundData = await this.findOneById(id);
    const data = await this.userCourseRepository.delete(foundData.data);

    return new ResData<UserCourse>(
      "User Course deleted successfully",
      200,
      data,
    );
  }
}
