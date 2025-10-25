import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserCourseProgress } from "../entities/user-course-progress.entity";
import { IUserCourseProgressRepository } from "../interfaces/user-course-progress.repository";
import { ID } from "src/common/types/type";
import { BaseAIRepository } from "./base-ai.repository";

@Injectable()
export class UserCourseProgressRepository extends BaseAIRepository implements IUserCourseProgressRepository {

    constructor(
        @InjectRepository(UserCourseProgress)
        private readonly userCourseProgressRepository: Repository<UserCourseProgress>,
    ) {
        super(UserCourseProgressRepository.name);
    }

    /**
     * Yangi kurs progress yozuvini yaratish
     * @param entity - UserCourseProgress entity
     * @returns Yaratilgan entity
     */
    async create(entity: UserCourseProgress): Promise<UserCourseProgress> {
        this.debugLog(`Creating course progress for user ${entity.userId} in course ${entity.courseId}`);
        return await this.userCourseProgressRepository.save(entity);
    }

    /**
     * ID bo'yicha kurs progress topish
     * @param id - Progress ID
     * @returns Topilgan progress yoki null
     */
    async findOneById(id: ID): Promise<UserCourseProgress | null> {
        this.debugLog(`Finding course progress by id: ${id}`);
        return await this.userCourseProgressRepository.findOne({
            where: { id },
            relations: ["user", "course"],
        });
    }

    /**
     * Foydalanuvchining barcha kurs progresslarini topish
     * @param userId - Foydalanuvchi ID
     * @returns Foydalanuvchining barcha kurs progresslari
     */
    async findByUserId(userId: ID): Promise<UserCourseProgress[]> {
        this.debugLog(`Finding all course progress for user: ${userId}`);
        return await this.userCourseProgressRepository.find({
            where: { userId },
            relations: ["user", "course"],
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Foydalanuvchi va kurs ID bo'yicha progress topish
     * @param userId - Foydalanuvchi ID
     * @param courseId - Kurs ID
     * @returns Topilgan progress yoki null
     */
    async findByUserIdAndCourseId(userId: ID, courseId: ID): Promise<UserCourseProgress | null> {
        this.debugLog(`Finding course progress for user ${userId} in course ${courseId}`);
        return await this.userCourseProgressRepository.findOne({
            where: {
                userId,
                courseId
            },
            relations: ["user", "course"],
        });
    }

    /**
     * Foydalanuvchining faol kurslarini topish
     * @param userId - Foydalanuvchi ID
     * @returns Faol kurs progresslari
     */
    async findByActiveCourses(userId: ID): Promise<UserCourseProgress[]> {
        this.debugLog(`Finding active courses for user: ${userId}`);
        return await this.userCourseProgressRepository.find({
            where: {
                userId,
                isActive: true
            },
            relations: ["user", "course"],
            order: { lastUpdatedAt: "DESC" },
        });
    }

    /**
     * Kurs progress yozuvini yangilash
     * @param entity - Yangilanishi kerak bo'lgan entity
     * @returns Yangilangan entity
     */
    async update(entity: UserCourseProgress): Promise<UserCourseProgress> {
        this.debugLog(`Updating course progress with id: ${entity.id}`);
        return await this.userCourseProgressRepository.save(entity);
    }

    /**
     * Kurs progress yozuvini o'chirish
     * @param id - O'chirilishi kerak bo'lgan progress ID
     * @returns O'chirilgan entity
     */
    async delete(id: ID): Promise<UserCourseProgress> {
        this.warnLog(`Deleting course progress with id: ${id}`); // Delete operatsiyasi muhim
        const entity = await this.findOneById(id);
        if (!entity) {
            this.errorLog(`Course progress with id ${id} not found`);
            throw new Error(`Course progress with id ${id} not found`);
        }
        await this.userCourseProgressRepository.remove(entity);
        return entity;
    }

    /**
     * Barcha kurs progress yozuvlarini topish
     * @returns Barcha progress yozuvlari
     */
    async findAll(): Promise<UserCourseProgress[]> {
        this.debugLog("Finding all course progress records");
        return await this.userCourseProgressRepository.find({
            relations: ["user", "course"],
            order: { createdAt: "DESC" },
        });
    }
}
