import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ILessonRepository } from "./interfaces/lesson.repository";
import { Lesson } from "./entities/lesson.entity";

@Injectable()
export class LessonRepository implements ILessonRepository {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepository: Repository<Lesson>,
  ) {}

  async create(dto: Lesson): Promise<Lesson> {
    const newLesson = this.lessonRepository.create(dto);
    return await this.lessonRepository.save(newLesson);
  }

  async findAll(): Promise<Lesson[]> {
    return await this.lessonRepository
      .createQueryBuilder("lesson")
      .leftJoin("lesson.block", "block") // block jadvalini qo'shish
      .addSelect(["block.id"]) // Faqat blockning `id` maydonini tanlash
      .getMany();
  }

  async findVideosTen(blockId: ID): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { block: { id: blockId } },
      relations: ["block"], // Block munosabatini qo'shish
      order: { order: "ASC" }, // order bo'yicha tartiblash
      take: 10, // Faqat 10 ta yozuvni olib kelish
    });
  }

  async findByIds(ids: number[]): Promise<Lesson[]> {
    return this.lessonRepository.findBy({ id: In(ids) });
  }

  async findLessonsByBlockId(blockId: ID): Promise<Lesson[]> {
    return await this.lessonRepository.find({
      where: { block: { id: blockId } },
      relations: ["block"],
      order: { order: "ASC" },
    });
  }

  async update(entity: Lesson): Promise<Lesson> {
    return await this.lessonRepository.save(entity);
  }

  async delete(entity: Lesson): Promise<Lesson> {
    return await this.lessonRepository.remove(entity);
  }

  async findById(id: ID): Promise<Lesson | null> {
    return await this.lessonRepository
      .createQueryBuilder("lesson")
      .leftJoinAndSelect("lesson.block", "block") // block bilan birga yuklash
      .where("lesson.id = :id", { id })
      .getOne();
  }

  async findOneByName(title: string): Promise<Lesson | null> {
    return await this.lessonRepository.findOneBy({ title });
  }

  async findNextFiveLessonsAfterOrder(
    lastLessonOrder: number,
    blockId: ID,
  ): Promise<Array<Lesson>> {
    return this.lessonRepository
      .createQueryBuilder("lesson")
      .where("lesson.order > :lastLessonOrder", { lastLessonOrder })
      .andWhere("lesson.block_id = :blockId", { blockId }) // blockId o'rniga block_id deb yozamiz
      .orderBy("lesson.order", "ASC")
      .limit(5)
      .getMany();
  }

  async findOneByOrder(order: number, blockId: ID, courseId?: ID): Promise<Lesson | null> {
    return await this.lessonRepository.findOne({
      where: {
        order: order,
        block: { id: blockId },
        course: courseId ? { id: courseId } : undefined,
      },
      relations: ['block', 'course'],
    });
  }


  async countByBlockId(blockId: ID): Promise<number> {
    return await this.lessonRepository.count({
      where: {
        block: { id: blockId },
      },
    });
  }
  
}
