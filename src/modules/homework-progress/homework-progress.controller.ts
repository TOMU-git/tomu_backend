import { Body, Controller, Delete, Get, Inject, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { ResData } from "src/lib/resData";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto";
import { ID } from "src/common/types/type";

// Define a custom interface that extends Express Request
interface RequestWithUser extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}

@ApiTags("homework-progress")
@Controller("homework-progress")
export class HomeworkProgressController {
  constructor(
    @Inject("IHomeworkProgressService")
    private readonly homeworkProgressService: IHomeworkProgressService,
  ) { }

  /**
   * Foydalanuvchi uchun uy vazifa videolarini olish
   * Agar schedule bo'lmasa, foydalanuvchi ko'rgan modullar asosida yangi schedule yaratadi
   * Bu API foydalanuvchi uchun barcha uy vazifalarni qaytaradi, blockId kerak emas
   * 
   * @param userId - Foydalanuvchi ID
   * @returns Foydalanuvchi uchun barcha uy vazifa videolari
   */
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("get-videos")
  async getVideos(
    @Req() req: RequestWithUser,
    @Query("courseId", ParseIntPipe) courseId: ID,
  ): Promise<ResData<Array<Partial<HomeworkProgress>>>> {
    const userId = req.user.id; // JWT orqali olingan foydalanuvchi ID
    return await this.homeworkProgressService.getUserHomeworkVideos(userId, courseId);
  }

  @Get('run-scheduler')
  async runScheduler() {
    // console.log("Manual scheduler ishga tushdi!");
    await this.homeworkProgressService['processHomeworkQueue'](); // private metodni chaqiryapmiz
    return { message: 'Scheduler ishga tushdi (manual test)', success: true };
  }

  /**
   * Barcha homework progress yozuvlarini olish.
   * @returns Barcha homework progress yozuvlari
   */
  @Get()
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findAll();
  }

  /**
   * Berilgan ID bo'yicha homework progress yozuvini yangilash.
   * @param id - Yangilanish uchun kerakli ID
   * @returns Yangilangan homework progress
   */
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.update(id);
  }

  /**
   * Berilgan ID bo'yicha homework progress yozuvini o'chirish.
   * @param id - O'chirish uchun kerakli ID
   * @returns O'chirilgan homework progress
   */
  @Delete(":id")
  async delete(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.delete(id);
  }

  /**
   * Foydalanuvchi uchun uy vazifa navbatidagi elementlar sonini qaytaradi
   * @returns Foydalanuvchi uchun uy vazifa navbatidagi elementlar soni
   */
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("queue-count")
  async getQueueCount(@Req() req: RequestWithUser, @Query("courseId", ParseIntPipe) courseId: ID): Promise<ResData<{ count: number }>> {
    const userId = req.user.id; // JWT orqali olingan foydalanuvchi ID
    return await this.homeworkProgressService.countQueueItems(userId, courseId);
  }

  /**
   * Foydalanuvchi uchun barcha kurslardagi uy vazifa navbatidagi elementlar sonini qaytaradi
   * Access token orqali foydalanuvchi ID si olinadi, courseId kerak emas
   * @returns Har bir kurs uchun uyga vazifa navbatidagi elementlar soni va kurs nomi
   */
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("total-queue-count")
  async getTotalQueueCount(@Req() req: RequestWithUser): Promise<ResData<Array<{ courseTitle: string; count: number }>>> {
    const userId = req.user.id; // JWT orqali olingan foydalanuvchi ID
    return await this.homeworkProgressService.countAllQueueItems(userId);
  }
}
