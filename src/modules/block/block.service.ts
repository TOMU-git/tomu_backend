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
import {
  BlockNotFoundException,
  BlockOrderExistException,
} from "./exception/block.exception";

@Injectable()
export class BlockService implements IBlockService {
  constructor(
    @Inject("IBlockRepository")
    private readonly blockRepository: IBlockRepository,

    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,
  ) { }

  async create(createBlockDto: CreateBlockDto): Promise<ResData<Block>> {
    // Kursni topish
    const course = await this.courseRepository.findById(
      Number(createBlockDto.courseId),
    );
    if (!course) {
      throw new CourseNotFoundException();
    }

    const orderExist = await this.blockRepository.findByOderCourseIdAndCategory(
      course.id,
      createBlockDto.category,
      createBlockDto.order,
    );

    if (orderExist) {
      throw new BlockOrderExistException();
    }

    // Yangi blokni yaratish, dars videolarini tekshirish shart emas
    const newBlock = new Block();
    newBlock.title = createBlockDto.title;
    newBlock.category = createBlockDto.category;
    newBlock.course = course;
    newBlock.order = createBlockDto.order;

    const newData = await this.blockRepository.create(newBlock);
    return new ResData<Block>("Block created successfully", 201, newData);
  }

  async findAll(): Promise<ResData<Array<Block>>> {
    const data = await this.blockRepository.findAll();

    if (data.length === 0) {
      return new ResData<Array<Block>>("Not any course yet", 200, data);
    }

    return new ResData<Array<Block>>(
      "Blocks retrieved successfully",
      200,
      data,
    );
  }

  async findOneById(id: ID): Promise<ResData<Block>> {
    const foundBlock = await this.blockRepository.findById(id);
    if (!foundBlock) {
      throw new BlockNotFoundException();
    }
    return new ResData<Block>("Block found", 200, foundBlock);
  }
  async getBlocksLessonsByCourseId(
    courseId: number,
  ): Promise<ResData<Array<Block>>> {
    const blocks =
      await this.blockRepository.getBlocksLessonsByCourseId(courseId);

    if (!blocks.length) {
      return new ResData<Array<Block>>("Not any block yet", 200, blocks);
    }

    return new ResData<Array<Block>>("Block found", 200, blocks);
  }

  async getBlocksHomeworksByCourseId(
    courseId: number,
  ): Promise<ResData<Array<Block>>> {
    const blocks =
      await this.blockRepository.getBlocksHomeworksByCourseId(courseId);

    if (!blocks.length) {
      return new ResData<Array<Block>>("Not any block yet", 200, blocks);
    }

    return new ResData<Array<Block>>("Block found", 200, blocks);
  }

  async update(
    id: ID,
    updateBlockDto: UpdateBlockDto,
  ): Promise<ResData<Block>> {
    const block = await this.blockRepository.findById(id);
    if (!block) {
      throw new BlockNotFoundException();
    }

    const orderExist = await this.blockRepository.findByOderCourseIdAndCategory(
      updateBlockDto.courseId,
      updateBlockDto.category,
      updateBlockDto.order,
    );
    if (orderExist && block.order !== updateBlockDto.order) {
      throw new BlockOrderExistException();
    }

    // Blokni yangilash, lessonlarni tekshirish shart emas
    block.title = updateBlockDto.title;
    block.category = updateBlockDto.category;
    block.order = updateBlockDto.order;
    block.course = await this.courseRepository.findById(
      Number(updateBlockDto.courseId),
    );

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

  /**
   * Barcha blocklarning countVideos qiymatini qayta hisoblaydi.
   * countVideos faqat lesson videolarini hisobga oladi (homework emas).
   * Bu metod mavjud ma'lumotlarni to'g'rilash uchun ishlatiladi.
   * @returns Yangilangan blocklar soni haqida ma'lumot
   */
  async recalculateCountVideos(): Promise<ResData<string>> {
    const blocks = await this.blockRepository.findAll();
    let updatedCount = 0;

    for (const block of blocks) {
      // Blokni relationlar bilan olish
      const blockWithRelations = await this.blockRepository.findById(block.id);
      if (blockWithRelations) {
        // Faqat lessonlar sonini hisoblash (homework emas)
        const actualCount = blockWithRelations.lessons?.length || 0;

        if (blockWithRelations.countVideos !== actualCount) {
          blockWithRelations.countVideos = actualCount;
          await this.blockRepository.update(blockWithRelations);
          updatedCount++;
        }
      }
    }

    return new ResData<string>(
      `countVideos recalculated successfully`,
      200,
      `Updated ${updatedCount} blocks out of ${blocks.length} total blocks`,
    );
  }
}
