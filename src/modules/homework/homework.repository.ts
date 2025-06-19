import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, MoreThan } from "typeorm";
import { IHomeworkRepository } from "./interfaces/homework.repository";
import { Homework } from "./entities/homework.entity";

@Injectable()
export class HomeworkRepository implements IHomeworkRepository {
  constructor(
    @InjectRepository(Homework)
    private homeworkRepository: Repository<Homework>,
  ) {}

  async create(dto: Homework): Promise<Homework> {
    const newHomework = await this.homeworkRepository.create(dto);
    await this.homeworkRepository.save(newHomework);
    return newHomework;
  }

  async findAll(): Promise<Array<Homework>> {
    return await this.homeworkRepository.find({
      relations: ["block"],
      select: {
        id: true,
        title: true,
        videoUrl: true,
        mimetype: true,
        size: true,
        order: true,
        duration: true,
        blockId: true,
        block: {
          id: true
        }
      }
    });
  }

  async update(entity: Homework): Promise<Homework> {
    return await this.homeworkRepository.save(entity);
  }

  async delete(entity: Homework): Promise<Homework> {
    return await this.homeworkRepository.remove(entity);
  }

  async findHomeworksByBlockId(blockId: ID): Promise<Homework[]> {
    return await this.homeworkRepository.find({
      where: { block: { id: blockId } },
      relations: ["block"],
      order: { order: "ASC" },
    });
  }

  async findById(id: ID): Promise<Homework | null> {
    return await this.homeworkRepository.findOne({
      where: { id },
      relations: ["block"],
      select: {
        id: true,
        title: true,
        videoUrl: true,
        mimetype: true,
        size: true,
        order: true,
        duration: true,
        blockId: true,
        block: {
          id: true
        }
      }
    });
  }

  async findOneByOrder(order: number, blockId: ID): Promise<Homework | null> {
    return await this.homeworkRepository.findOne({
      where: {
        order: order,
        block: { id: blockId },
      },
      relations: ["block"]
    });
  }

  async findNextFiveHomeworksAfterOrder(
    lastHomeworkOrder: number,
    blockId: ID,
  ): Promise<Array<Homework>> {
    return await this.homeworkRepository.find({
      where: {
        order: MoreThan(lastHomeworkOrder),
        blockId: blockId
      },
      relations: ["block"],
      select: {
        id: true,
        title: true,
        videoUrl: true,
        mimetype: true,
        size: true,
        order: true,
        duration: true,
        blockId: true,
        block: {
          id: true
        }
      },
      order: { order: "ASC" },
      take: 5
    });
  }

  async getNextFiveVideos(
    order: number,
    blockId: ID,
  ): Promise<Array<Homework>> {
    return await this.homeworkRepository.find({
      where: {
        order: MoreThan(order),
        blockId: blockId
      },
      relations: ["block"],
      select: {
        id: true,
        title: true,
        videoUrl: true,
        mimetype: true,
        size: true,
        order: true,
        duration: true,
        blockId: true,
        block: {
          id: true
        }
      },
      order: { order: "ASC" },
      take: 5
    });
  }

  async findOneByName(title: string): Promise<Homework | null> {
    return await this.homeworkRepository.findOneBy({ title: title });
  }


  async countByBlockId(blockId: ID): Promise<number> {
    return await this.homeworkRepository.count({
      where: {
        block: { id: blockId },
      },
    });
  }
}
