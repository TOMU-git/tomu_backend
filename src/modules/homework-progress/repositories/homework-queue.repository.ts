// src/modules/homework-progress/repositories/homework-queue.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { HomeworkQueue } from "../entities/homework-queue.entity";
import { LessThan, Repository, DeleteResult } from "typeorm";
import { ID } from "src/common/types/type";
import { Homework } from "src/modules/homework/entities/homework.entity";

@Injectable()
export class HomeworkQueueRepository {
  constructor(
    @InjectRepository(HomeworkQueue)
    private readonly repository: Repository<HomeworkQueue>,
  ) { }

  async findByUser(userId: ID): Promise<HomeworkQueue[]> {
    return this.repository.find({
      where: { userId },
      relations: ["homework"],
      order: { priority: "DESC" },
    });
  }


  async findById(id: ID): Promise<HomeworkQueue> {
    return this.repository.findOne({
      where: { id },
      relations: ["homework"],
    });
  }

  /**
   * Foydalanuvchi ID si bo'yicha uyga vazifa navbatlarini olish
   * 
   * @param userId - Foydalanuvchi ID
   * @returns Foydalanuvchi uchun uyga vazifa navbati
   */
  async findByUserIdAndCourseId(userId: ID, courseId: ID): Promise<HomeworkQueue[]> {
    return this.repository.find({
      where: { userId: Number(userId), courseId: Number(courseId) },
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
      where: { userId },
    });
  }

  async addToQueue(queue: Partial<HomeworkQueue>): Promise<HomeworkQueue> {
    try {
      // Homework va block order ni olish uchun homework ni topish
      if (queue.homeworkId && (!queue.homeworkOrder || !queue.blockOrder || !queue.courseId)) {
        const homework = await this.repository.manager.findOne(Homework, {
          where: { id: Number(queue.homeworkId) },
          relations: ['block', 'block.course']
        });

        if (homework) {
          // Homework order ni o'rnatish
          if (!queue.homeworkOrder && typeof homework.order === 'number') {
            queue.homeworkOrder = homework.order;
          }

          // Block order ni o'rnatish
          if (!queue.blockOrder && homework.block && typeof homework.block.order === 'number') {
            queue.blockOrder = homework.block.order;
          } else if (!queue.blockOrder) {
            queue.blockOrder = 0; // Default qiymat
          }

          // Course ID ni o'rnatish
          if (!queue.courseId && homework.block && homework.block.course && homework.block.course.id) {
            queue.courseId = homework.block.course.id;
          } else if (!queue.courseId) {
            throw new Error('Course ID is required but not available from homework.block.course');
          }
        } else {
          throw new Error(`Homework not found with ID: ${queue.homeworkId}`);
        }
      } else if (!queue.courseId) {
        throw new Error('Course ID is required but not provided');
      }
    } catch (error) {
      console.error('Error in addToQueue:', error.message);
      throw error;
    }

    const newItem = this.repository.create(queue);
    const savedItem = await this.repository.save(newItem);

    // Homework relationni qayta yuklash
    return this.repository.findOne({
      where: { id: savedItem.id },
      relations: ['homework']
    });
  }

  async removeFromQueue(id: ID): Promise<DeleteResult> {
    return this.repository.delete(id);
  }
  /**
   * Foydalanuvchi va queue item ID si bo'yicha uyga vazifa navbatini olish
   * 
   * @param userId - Foydalanuvchi ID
   * @param queueId - Queue item ID
   * @returns HomeworkQueue yozuvi yoki null
   */
  async findByUserIdAndQueueId(userId: ID, queueId: ID): Promise<HomeworkQueue | null> {
    return this.repository.findOne({
      where: {
        id: Number(queueId),
        userId: Number(userId)
      },
      relations: ["homework"]
    });
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

  /**
   * Foydalanuvchi ID si bo'yicha uyga vazifa navbatidagi elementlar sonini hisoblash
   * Faqat scheduledAt vaqti kelgan yoki null bo'lgan elementlarni sanaydi
   * 
   * @param userId - Foydalanuvchi ID
   * @returns Foydalanuvchi uchun uyga vazifa navbatidagi elementlar soni
   */
  async countQueueItemsByUserId(userId: ID, courseId: ID): Promise<number> {
    const now = new Date();
    return this.repository
      .createQueryBuilder('queue')
      .where('queue.user_id = :userId', { userId: Number(userId) })
      .andWhere('queue.course_id = :courseId', { courseId: Number(courseId) })
      .andWhere('(queue.scheduled_at IS NULL OR queue.scheduled_at <= :now)', { now })
      .getCount();
  }

  /**
   * Foydalanuvchi ID si bo'yicha barcha kurslar uchun uyga vazifa navbatidagi elementlar sonini hisoblash
   * 
   * @param userId - Foydalanuvchi ID
   * @returns Foydalanuvchi uchun barcha kurslardagi uyga vazifa navbatidagi elementlar soni
   */
  async countAllQueueItemsByUserId(userId: ID): Promise<number> {
    return this.repository.count({
      where: { userId: Number(userId) }
    });
  }

  async findByUserId(userId: number): Promise<HomeworkQueue[]> {
    return this.repository.createQueryBuilder('queue')
      .where('queue.userId = :userId', { userId })
      .getMany();
  }

  /**
   * Foydalanuvchi ID si bo'yicha har bir kurs uchun uyga vazifa navbatidagi elementlar sonini hisoblash
   * 
   * @param userId - Foydalanuvchi ID
   * @returns Har bir kurs uchun uyga vazifa navbatidagi elementlar soni va kurs tili (ar, eng, ru)
   */
  async countQueueItemsGroupedByCourse(userId: ID): Promise<Array<{ courseTitle: string; count: number }>> {
    const now = new Date();
    const result = await this.repository
      .createQueryBuilder('queue')
      .leftJoin('courses', 'course', 'course.id = queue.course_id')
      .select('queue.course_id', 'courseId')
      .addSelect('COALESCE(MAX(course.lang), \'unknown\')', 'courseTitle')
      .addSelect('COUNT(queue.id)', 'count')
      .where('queue.user_id = :userId', { userId: Number(userId) })
      .andWhere('(queue.scheduled_at IS NULL OR queue.scheduled_at <= :now)', { now })
      .groupBy('queue.course_id')
      .orderBy('queue.course_id', 'ASC')
      .getRawMany();

    return result.map(item => ({
      courseTitle: item.courseTitle,
      count: parseInt(item.count, 10)
    }));
  }
}