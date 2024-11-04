import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
    return await this.homeworkRepository
      .createQueryBuilder("homework")
      .leftJoinAndSelect("homework.block", "block") // block bilan bog'lanish
      .select([
        "homework", // homework ma'lumotlarini olish
        "block.id", // faqat block id sini olish
      ])
      .getMany(); // barcha homework yozuvlarini olish
  }

  async update(entity: Homework): Promise<Homework> {
    return await this.homeworkRepository.save(entity);
  }

  async delete(entity: Homework): Promise<Homework> {
    return await this.homeworkRepository.remove(entity);
  }

  async findById(id: ID): Promise<Homework | null> {
    return await this.homeworkRepository
      .createQueryBuilder("homework")
      .leftJoinAndSelect("homework.block", "block") // block ni qo'shish
      .select([
        "homework", // homework ma'lumotlarini olish
        "block.id", // faqat block id sini olish
      ])
      .where("homework.id = :id", { id }) // id ga mos keladigan homework ni tanlash
      .getOne(); // bitta yozuvni olish
  }

  async findOneByOrder(order: number, blockId: ID): Promise<Homework | null> {
    return await this.homeworkRepository.findOne({
      where: {
        order: order,
        block: { id: blockId },
      },
    });
  }

  async getNextFiveVideos(
    order: number,
    blockId: ID,
  ): Promise<Array<Homework>> {
    return await this.homeworkRepository
      .createQueryBuilder("homework")
      .where("homework.order > :order", { order })
      .andWhere("homework.block_id = :blockId", { blockId })
      .orderBy("homework.order", "ASC")
      .limit(5)
      .getMany();
  }

  async findOneByName(title: string): Promise<Homework | null> {
    return await this.homeworkRepository.findOneBy({ description: title });
  }
}
