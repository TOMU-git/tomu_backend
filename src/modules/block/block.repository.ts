import { Injectable } from "@nestjs/common";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Block } from "./entities/block.entity";
import { IBlockRepository } from "./interfaces/block.repository";
import { HomeworkEnum } from "src/common/enums/enum";

@Injectable()
export class BlockRepository implements IBlockRepository {
  constructor(
    @InjectRepository(Block)
    private blockRepository: Repository<Block>,
  ) {}

  // Yangi Block ma'lumotini yaratish va saqlash
  async create(dto: Block): Promise<Block> {
    const newBlock = await this.blockRepository.create(dto);
    await this.blockRepository.save(newBlock);
    return newBlock;
  }

  // Barcha Block'larni createdAt ustuni bo‘yicha tartiblab olish
  async findAll(): Promise<Array<Block>> {
    return await this.blockRepository.find({});
  }

  // Mavjud Block ma'lumotlarini yangilash
  async update(entity: Block): Promise<Block> {
    return await this.blockRepository.save(entity);
  }

  // Mavjud Block ma'lumotlarini o'chirish
  async delete(entity: Block): Promise<Block> {
    return await this.blockRepository.remove(entity);
  }

  // ID bo‘yicha Block ma'lumotini topish
  async findById(id: ID): Promise<Block | null> {
    return await this.blockRepository.findOne({
      where: { id },
      relations: ["homework"], // homework bilan bog'liq ma'lumotlarni olish
    });
  }

  // Nom bo‘yicha Block ma'lumotini topish
  async findOneByName(title: string): Promise<Block | null> {
    return await this.blockRepository.findOneBy({ title });
  }

  // Berilgan courseId va HOMEWORK kategoriyasiga mos Block'larni order bo‘yicha tartiblab olish
  async getBlocksHomeworksByCourseId(courseId: number): Promise<Array<Block>> {
    return this.blockRepository.find({
      where: {
        course: { id: courseId },
        category: HomeworkEnum.HOMEWORK,
      },
      relations: ["course"],
      order: { order: "ASC" },
    });
  }

  // Berilgan courseId va LESSON kategoriyasiga mos Block'larni order bo‘yicha tartiblab olish
  async getBlocksLessonsByCourseId(courseId: number): Promise<Array<Block>> {
    return this.blockRepository.find({
      where: {
        course: { id: courseId },
        category: HomeworkEnum.LESSON,
      },
      relations: ["course"],
      order: { order: "ASC" },
    });
  }
}
