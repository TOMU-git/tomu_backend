import { Inject, Injectable } from "@nestjs/common";
import { IHomeworkRepository } from "./interfaces/homework.repository";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { IHomeworkService } from "./interfaces/homework.service";
import {
  HomeworkNotFoundException,
  HomeworkOrderAlreadyExistException,
} from "./exception/homework.exception";
import { UpdateHomeworkDto } from "./dto/update-homework.dto";
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { Homework } from './entities/homework.entity';
import { IBlockRepository } from '../block/interfaces/block.repository';
import { BlockNotFoundException } from '../block/exception/block.exception';
import { VimeoService } from '../lesson/vimeo.service';

@Injectable()
export class HomeworkService implements IHomeworkService {
  constructor(
    @Inject("IHomeworkRepository")
    private readonly homeworkRepository: IHomeworkRepository,

    @Inject("IBlockRepository")
    private readonly blockRepository: IBlockRepository,

    private readonly vimeoService: VimeoService, // Inject VimeoService
  ) {}

  async create(
    createHomeworkDto: CreateHomeworkDto,
    file: Express.Multer.File,
  ): Promise<ResData<Homework>> {
    const block = await this.blockRepository.findById(
      createHomeworkDto.blockId,
    );
    if (!block) {
      throw new BlockNotFoundException();
    }
    console.log(createHomeworkDto)

    const orderExist = await this.homeworkRepository.findOneByOrder(
      createHomeworkDto.order,
      createHomeworkDto.blockId,
    );

    // Agar bazada shu order va blockId kombinatsiyasi mavjud bo'lsa, xatolik chiqarish
    if (orderExist) {
      throw new HomeworkOrderAlreadyExistException();
    }

    // return new ResData<Homework>('Homework created successfully', 201);

    const { videoUrl, duration } = await this.vimeoService.uploadVideo(
      file.buffer,
      createHomeworkDto.description,
      "Dars videosi",
    );

    block.duration = Number(block.duration) + Number(duration);
    block.countVideos = Number(block.countVideos) + 1;
    await this.blockRepository.update(block);

    let newHomework = new Homework();
    newHomework.block = block;
    newHomework.videoUrl = videoUrl;
    newHomework.mimetype = file.mimetype;
    newHomework.size = file.size;
    newHomework.duration = duration;
    newHomework = Object.assign(newHomework, createHomeworkDto);
    const newData = await this.homeworkRepository.create(newHomework);

    return new ResData<Homework>("Homework created successfully", 201, newData);
  }

  async findAll(): Promise<ResData<Array<Homework>>> {
    const data = await this.homeworkRepository.findAll();

    return new ResData<Array<Homework>>("ok", 200, data);
  }

  async findOneById(id: ID): Promise<ResData<Homework>> {
    const foundData = await this.homeworkRepository.findById(id);
    if (!foundData) {
      throw new HomeworkNotFoundException();
    }

    return new ResData<Homework>("ok", 200, foundData);
  }

  async update(
    id: ID,
    updateHomeworkDto: UpdateHomeworkDto,
    file: Express.Multer.File,
  ): Promise<ResData<Homework>> {
    const { data: foundData } = await this.findOneById(id);

    const orderExist = await this.homeworkRepository.findOneByOrder(
      updateHomeworkDto.order,
      updateHomeworkDto.blockId,
    );

    // Agar bazada shu order va blockId kombinatsiyasi mavjud bo'lsa, xatolik chiqarish
    if (orderExist) {
      throw new HomeworkOrderAlreadyExistException();
    }

    const block = await this.blockRepository.findById(
      updateHomeworkDto.blockId,
    );
    if (!block) {
      throw new BlockNotFoundException();
    }

    foundData.order = updateHomeworkDto.order;
    foundData.description = updateHomeworkDto.description;
    foundData.block = block;

    if (file) {
      // Yangi video faylni yuklaydi
      const { videoUrl, duration } = await this.vimeoService.uploadVideo(
        file.buffer,
        updateHomeworkDto.description,
        "Dars videosi",
        // file.size,
      );

      foundData.videoUrl = videoUrl;
      foundData.mimetype = file.mimetype;
      foundData.size = file.size;
      foundData.duration = duration;
    }
    const updatedData = Object.assign(foundData, updateHomeworkDto);
    // const data = await this.homeworkRepository.update(foundData);

    return new ResData<Homework>(
      "Homework updated successfully",
      200,
      updatedData,
    );
  }

  async getNextFiveVideos(
    order: ID,
    blockId: ID,
  ): Promise<ResData<Array<Homework>>> {
    const data = await this.homeworkRepository.getNextFiveVideos(
      order,
      blockId,
    );

    return new ResData<Array<Homework>>(
      "Videos fetched successfully",
      200,
      data,
    );
  }

  async delete(id: ID): Promise<ResData<Homework>> {
    const { data: foundData } = await this.findOneById(id);
    const data = await this.homeworkRepository.delete(foundData);

    const foundBlock = await this.blockRepository.findById(foundData.block.id);
    foundBlock.duration =
      Number(foundBlock.duration) - Number(foundData.duration);
    foundBlock.countVideos = Number(foundBlock.countVideos) - 1;
    await this.blockRepository.update(foundBlock);

    return new ResData<Homework>("Homework deleted successfully", 200, data);
  }
}
