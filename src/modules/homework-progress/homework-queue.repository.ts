// src/modules/homework-progress/repositories/homework-queue.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { HomeworkQueue } from "./entities/homework-queue.entity";
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
    return this.repository.save(newItem);
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