// src/modules/homework-progress/repositories/homework-watch-record.repository.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, LessThan } from "typeorm";
import { HomeworkWatchRecord } from "./entities/homework-watch-record.entity";
import { ID } from "src/common/types/type";

@Injectable()
export class HomeworkWatchRecordRepository {
  constructor(
    @InjectRepository(HomeworkWatchRecord)
    private readonly repository: Repository<HomeworkWatchRecord>,
  ) {}

  async findByUserAndHomework(
    userId: ID,
    homeworkId: ID,
  ): Promise<HomeworkWatchRecord | null> {
    return this.repository.findOne({
      where: { userId, homeworkId },
    });
  }

  async create(
    record: Partial<HomeworkWatchRecord>,
  ): Promise<HomeworkWatchRecord> {
    const newRecord = this.repository.create(record);
    return this.repository.save(newRecord);
  }

  async update(
    userId: ID,
    homeworkId: ID,
    data: Partial<HomeworkWatchRecord>,
  ): Promise<HomeworkWatchRecord | null> {
    const record = await this.findByUserAndHomework(userId, homeworkId);
    if (!record) {
      return null;
    }

    Object.assign(record, data);
    return this.repository.save(record);
  }

  async getCompletedHomeworkCount(userId: ID): Promise<number> {
    return this.repository.count({
      where: { userId, watchCount: 10 },
    });
  }

  async getHomeworksWithWatchCount(
    userId: ID,
    moduleIds: ID[],
  ): Promise<HomeworkWatchRecord[]> {
    return this.repository.find({
      where: {
        userId,
        moduleId: In(moduleIds),
        watchCount: LessThan(10),
      },
      order: { watchCount: "ASC" },
    });
  }
}