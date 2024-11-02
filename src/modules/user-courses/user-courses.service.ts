import { Inject, Injectable } from "@nestjs/common";
import { CreateUserCourseDto } from "./dto/create-user-course.dto";
import { UpdateUserCourseDto } from "./dto/update-user-course.dto";
import { UserCourse } from "./entities/user-course.entity";
import { IUserCourseRepository } from "./interfaces/user-course.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IUserCourseService } from "./interfaces/user-course.service";
<<<<<<< HEAD
import {
  UserCourseAlreadyExistException,
  UserCourseNotFoundException,
} from "./exception/user-course.exception";
import { ICourseService } from "../course/interfaces/course.service";
import { IUserService } from "../user/interfaces/user.service";
=======
import { UserCourseNotFoundException } from "./exception/user-course.exception";
import { ICourseRepository } from "../course/interfaces/course.repository";
import { CourseNotFoundException } from "../course/exception/course.exception";
import { IUserRepository } from "../user/interfaces/user.repository";
import { UserNotFound } from "../user/exception/user.exception";
>>>>>>> 4a279b633edda6bcdf6520321f5768221e891505

@Injectable()
export class UserCourseService implements IUserCourseService {
  constructor(
    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,
<<<<<<< HEAD
    @Inject("ICourseService") private readonly courseService: ICourseService,
    @Inject("IUserService") private readonly userService: IUserService
=======

    @Inject("IUserRepository")
    private readonly userRepository: IUserRepository,

    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,
>>>>>>> 4a279b633edda6bcdf6520321f5768221e891505
  ) {}

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
<<<<<<< HEAD
    
    await this.courseService.findOneById(createUserCourseDto.courseId);
    await this.userService.findOneById(createUserCourseDto.userId);
=======

    const foundCourse = await this.courseRepository.findById(
      createUserCourseDto.courseId,
    );
    if (!foundCourse) {
      throw new CourseNotFoundException();
    }

>>>>>>> 4a279b633edda6bcdf6520321f5768221e891505
    let newUserCourse = new UserCourse();
    newUserCourse.course = foundCourse;
    newUserCourse.user = foundUser;
    newUserCourse = Object.assign(newUserCourse, createUserCourseDto);
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

  async findOneByUserId(id: ID): Promise<ResData<Array<UserCourse>>> {
    const foundData = await this.userCourseRepository.findByUserId(id);
    if (!foundData) {
      throw new UserCourseNotFoundException();
    }
    return new ResData<Array<UserCourse>>("ok", 200, foundData);
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
<<<<<<< HEAD
=======

    // Yangilangan UserCourse haqida muvaffaqiyatli javob qaytaramiz
>>>>>>> 4a279b633edda6bcdf6520321f5768221e891505
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
