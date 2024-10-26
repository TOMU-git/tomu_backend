import { Inject, Injectable } from "@nestjs/common";
import { CreateBlockDto } from "./dto/create-block.dto";
import { UpdateBlockDto } from "./dto/update-block.dto";
import { Block } from "./entities/block.entity";
import { IBlockRepository } from "./interfaces/block.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IBlockService } from "./interfaces/block.service";
import { CourseNotFoundException } from "../course/exception/course.exception";
import { ICourseRepository } from "../course/interfaces/course.repository";
import { BlockNotFoundException } from "./exception/block.exception";

@Injectable()
export class BlockService implements IBlockService {
  constructor(
    @Inject("IBlockRepository")
    private readonly blockRepository: IBlockRepository,

    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,
  ) {}

  async create(createBlockDto: CreateBlockDto): Promise<ResData<Block>> {
    // Kursni topish
    const course = await this.courseRepository.findById(
      Number(createBlockDto.courseId),
    );
    if (!course) {
      throw new CourseNotFoundException();
    }

    // Yangi blokni yaratish, dars videolarini tekshirish shart emas
    const newBlock = new Block();
    newBlock.title = createBlockDto.title;
    newBlock.course = course;

    const newData = await this.blockRepository.create(newBlock);
    return new ResData<Block>("Block created successfully", 201, newData);
  }

  async findAll(): Promise<ResData<Block[]>> {
    const data = await this.blockRepository.findAll();

    if (data.length === 0) {
      return new ResData<Block[]>("Not any course yet", 200, data);
    }

    return new ResData<Block[]>("Blocks retrieved successfully", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Block>> {
    const foundBlock = await this.blockRepository.findById(id);
    if (!foundBlock) {
      throw new BlockNotFoundException();
    }
    return new ResData<Block>("Block found", 200, foundBlock);
  }

  async getBlocksByCourseId(courseId: number): Promise<Block[]> {
    const blocks = await this.blockRepository.getBlocksByCourseId(courseId);

    if (!blocks.length) {
      throw new BlockNotFoundException();
    }

    return blocks;
  }

  async update(
    id: ID,
    updateBlockDto: UpdateBlockDto,
  ): Promise<ResData<Block>> {
    const block = await this.blockRepository.findById(id);
    if (!block) {
      throw new BlockNotFoundException();
    }

    // Blokni yangilash, lessonlarni tekshirish shart emas
    block.title = updateBlockDto.title;

    const updatedData = await this.blockRepository.update(block);
    return new ResData<Block>("Block updated successfully", 200, updatedData);
  }

  async delete(id: ID): Promise<ResData<Block>> {
    const block = await this.blockRepository.findById(id);
    if (!block) {
      throw new BlockNotFoundException();
    }
    await this.blockRepository.delete(block);
    return new ResData<Block>("Block deleted successfully", 200, block);
  }
}
