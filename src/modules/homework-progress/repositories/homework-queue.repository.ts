// src/modules/homework-progress/repositories/homework-queue.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { HomeworkQueue } from "../entities/homework-queue.entity";
import { ID } from "src/common/types/type";

@Injectable()
export class HomeworkQueueRepository {
  constructor(
    @InjectRepository(HomeworkQueue)
    private readonly repository: Repository<HomeworkQueue>,
  ) {}

  async findByUser(userId: ID): Promise<HomeworkQueue[]> {
    return this.repository.find({
      where: { userId },
      relations: ["homework"],
      order: { priority: "DESC" },
    });
  }

  /**
   * Foydalanuvchi ID si bo'yicha uyga vazifa navbatlarini olish
   * 
   * @param userId - Foydalanuvchi ID
   * @returns Foydalanuvchi uchun uyga vazifa navbati
   */
  async findByUserId(userId: ID): Promise<HomeworkQueue[]> {
    return this.repository.find({
      where: { userId: Number(userId) },
      relations: ["homework"],
      order: { priority: "DESC" },
    });
  }

  /**
   * Foydalanuvchi va homework ID si bo'yicha uyga vazifa navbatini olish
   * 
   * @param userId - Foydalanuvchi ID
   * @param homeworkId - Homework ID
   * @returns HomeworkQueue yozuvi yoki null
   */
  async findByUserIdAndHomeworkId(userId: ID, homeworkId: ID): Promise<HomeworkQueue | null> {
    return this.repository.findOne({
      where: { 
        userId: Number(userId),
        homeworkId: Number(homeworkId)
      },
      relations: ["homework"]
    });
  }

  /**
   * Yangi homework queue yozuvini yaratish
   * 
   * @param homeworkQueue - Yaratilishi kerak bo'lgan HomeworkQueue
   * @returns Yaratilgan HomeworkQueue yozuvi
   */
  async create(homeworkQueue: HomeworkQueue): Promise<HomeworkQueue> {
    const newQueue = this.repository.create(homeworkQueue);
    await this.repository.save(newQueue);
    return newQueue;
  }

  async findScheduledHomeworksByUser(userId: ID): Promise<HomeworkQueue[]> {
    return this.repository.find({
      where: { 
        userId, 
        isScheduled: true,
        scheduledAt: LessThan(new Date())
      },
      relations: ["homework"],
      order: { scheduledAt: "ASC" },
    });
  }

  async countPendingHomeworksByUser(userId: ID): Promise<number> {
    return this.repository.count({
      where: { userId, isScheduled: true },
    });
  }

  async addToQueue(queue: Partial<HomeworkQueue>): Promise<HomeworkQueue> {
    const newItem = this.repository.create(queue);
    const savedItem = await this.repository.save(newItem);
    
    // Homework relationni qayta yuklash
    return this.repository.findOne({
      where: { id: savedItem.id },
      relations: ['homework']
    });
  }

  async removeFromQueue(id: ID): Promise<void> {
    await this.repository.delete(id);
  }

  async scheduleHomework(
    id: ID,
    scheduledAt: Date,
  ): Promise<HomeworkQueue | null> {
    const item = await this.repository.findOne({ where: { id } });
    if (!item) {
      return null;
    }

    item.isScheduled = true;
    item.scheduledAt = scheduledAt;
    return this.repository.save(item);
  }
}