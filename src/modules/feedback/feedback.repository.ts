import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Feedback } from "./entities/feedback.entity";
import { IFeedbackRepository } from "./interfaces/feedback.repository";

@Injectable()
export class FeedbackRepository implements IFeedbackRepository {
  constructor(
    @InjectRepository(Feedback)
    private courseRepository: Repository<Feedback>,
  ) {}

  async create(dto: Feedback): Promise<Feedback> {
    const newFeedback = await this.courseRepository.create(dto);
    await this.courseRepository.save(newFeedback);
    return newFeedback;
  }

  async findAll(): Promise<Array<Feedback>> {
    return await this.courseRepository.find({
      relations: ['user'],
      select: {
        id: true,
        comment: true,
        user: {
          firstName: true,
          lastName: true,
        },
      },
    });
  }

  async update(entity: Feedback): Promise<Feedback> {
    return await this.courseRepository.save(entity);
  }

  async delete(entity: Feedback): Promise<Feedback> {
    return await this.courseRepository.remove(entity);
  }

  async findById(id: ID): Promise<Feedback | null> {
    return await this.courseRepository.findOneBy({ id });
  }
}
