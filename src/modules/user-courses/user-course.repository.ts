import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IUserCourseRepository } from "./interfaces/user-course.repository";
import { UserCourse } from "./entities/user-course.entity";

@Injectable()
export class UserCourseRepository implements IUserCourseRepository {
  constructor(
    @InjectRepository(UserCourse)
    private userCourseRepository: Repository<UserCourse>,
  ) { }

  /**
   * Yangi UserCourse ma'lumotlarini yaratadi va saqlaydi.
   * @param dto Yaratiladigan UserCourse obyektining ma'lumotlari
   * @returns Yaratilgan UserCourse obyekti
   */
  async create(dto: UserCourse): Promise<UserCourse> {
    // Yangi UserCourse obyektini yaratish
    const newUserCourse = await this.userCourseRepository.save(dto);
    return newUserCourse; // Saqlangan obyektni qaytaradi
  }

  /**
   * Barcha UserCourse obyektlarini topadi va qaytaradi.
   * @returns UserCourse obyektlarining ro'yxati
   */
  async findAll(): Promise<Array<UserCourse>> {
    // Barcha UserCourse obyektlarini bazadan olish
    return await this.userCourseRepository.find();
  }

  async findByTariffIdAndUserId(
    userId: number,
    courseId: number,
  ): Promise<UserCourse | null> {
    return await this.userCourseRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
      },
      relations: ["user", "course"], // bu muhim
    });
  }

  /**
   * Berilgan UserCourse obyektini yangilaydi va qaytaradi.
   * @param entity Yangilanadigan UserCourse obyekti
   * @returns Yangilangan UserCourse obyekti
   */
  async update(entity: UserCourse): Promise<UserCourse> {
    // UserCourse obyektini yangilab, saqlash
    return await this.userCourseRepository.save(entity);
  }

  /**
   * Berilgan UserCourse obyektini o'chiradi va qaytaradi.
   * @param entity O'chiriladigan UserCourse obyekti
   * @returns O'chirilgan UserCourse obyekti
   */
  async delete(entity: UserCourse): Promise<UserCourse> {
    // UserCourse obyektini bazadan o'chirish
    return await this.userCourseRepository.remove(entity);
  }

  /**
   * ID bo'yicha bitta UserCourse obyektini topadi.
   * @param id Qidirilayotgan UserCourse-ning ID'si
   * @returns Topilgan UserCourse yoki null
   */
  async findById(id: ID): Promise<UserCourse | null> {
    // Berilgan ID bo'yicha UserCourse obyektini topish va bog'langan course va user ma'lumotlarini olish
    return await this.userCourseRepository.findOne({
      where: { id },
      relations: ["course", "user"], // course va user bilan bog'lanishni ko'rsatamiz
    });
  }

  /**
   * User ID bo'yicha barcha UserCourse obyektlarini topadi va ular bilan bog'liq kurslar ma'lumotlarini qaytaradi.
   * @param userId Qidirilayotgan User ID'si
   * @returns User ID bilan bog'langan UserCourse obyektlari ro'yxati
   */
  async findByUserId(userId: ID): Promise<Array<UserCourse>> {
    // User ID bo'yicha UserCourse obyektlarini topish va ular bilan bog'liq kurs ma'lumotlarini olish
    return await this.userCourseRepository.find({
      where: { user: { id: userId } },
      relations: ["course"], // Bog'langan Course obyektini qo'shish
    });
  }

  /**
   * Kurs ID bo'yicha barcha UserCourse obyektlarini topadi.
   * @param courseId Qidirilayotgan Course ID'si
   * @returns Course ID bilan bog'langan UserCourse obyektlari ro'yxati
   */
  async findByCourseId(courseId: ID): Promise<Array<UserCourse>> {
    // Kurs ID bo'yicha UserCourse obyektlarini topish
    return await this.userCourseRepository.findBy({ course: { id: courseId } });
  }

  async findByUserIdAndCourseId(
    userId: number,
    courseId: number,
  ): Promise<UserCourse | null> {
    // console.log('[UserCourseRepository.findByUserIdAndCourseId] Searching - User ID:', userId, 'Course ID:', courseId);

    const result = await this.userCourseRepository.findOne({
      where: {
        user: { id: userId },
        course: { id: courseId },
      },
      relations: ['user', 'course'], // kerakli joinlar
    });

    // console.log('[UserCourseRepository.findByUserIdAndCourseId] Result:', result ? {
    //   id: result.id,
    //   userId: result.user?.id,
    //   courseId: result.course?.id,
    //   isActive: result.isActive,
    //   status: result.status
    // } : 'NULL');

    return result;
  }

}
