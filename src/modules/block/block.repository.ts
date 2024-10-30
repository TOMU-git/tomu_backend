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

  async create(dto: Block): Promise<Block> {
    const newBlock = await this.blockRepository.create(dto);
    await this.blockRepository.save(newBlock);
    return newBlock;
  }

  async findAll(): Promise<Array<Block>> {
    return await this.blockRepository.find({ order: {createdAt: 'ASC'},
      relations: ['lessons']
    });
  }

  async findAllHomeworkBlocks(id: number): Promise<Block[]>{
    return await this.blockRepository.find({where : {courseId: id, category: HomeworkEnum.HOMEWORK}})
  }

  async update(entity: Block): Promise<Block> {
    return await this.blockRepository.save(entity);
  }

  async delete(entity: Block): Promise<Block> {
    return await this.blockRepository.remove(entity);
  }

  async findById(id: ID): Promise<Block | null> {
    return await this.blockRepository.findOneBy({ id });
  }

  async findOneByName(title: string): Promise<Block | null> {
    return await this.blockRepository.findOneBy({ title });
  }

  async getBlocksByCourseId(id: number): Promise<Block[]> {
    return this.blockRepository.find({
      where: { courseId: id},
      relations: ["course"],
    });
  }
}
