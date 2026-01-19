import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Inject,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateBlockDto } from "./dto/create-block.dto";
import { UpdateBlockDto } from "./dto/update-block.dto";
import { ResData } from "src/lib/resData";
import { Block } from "./entities/block.entity";
import { IBlockService } from "./interfaces/block.service";
import { ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { Auth } from "src/common/decorator/auth.decorator";

@ApiTags("block")
@Controller("block")
export class BlockController {
  constructor(
    @Inject("IBlockService")
    private readonly blockService: IBlockService,
  ) { }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  async create(
    @Body() createBlockDto: CreateBlockDto,
  ): Promise<ResData<Block>> {
    return await this.blockService.create(createBlockDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Block>>> {
    return await this.blockService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Block>> {
    return await this.blockService.findOneById(id);
  }

  @Get("/course-lesson/:courseId")
  async getBlocksLessonsByCourseId(
    @Param("courseId", ParseIntPipe) courseId: ID,
  ): Promise<ResData<Array<Block>>> {
    return this.blockService.getBlocksLessonsByCourseId(courseId);
  }

  @Get("/course-homework/:courseId")
  async getBlocksHomeworksByCourseId(
    @Param("courseId", ParseIntPipe) courseId: ID,
  ): Promise<ResData<Array<Block>>> {
    return this.blockService.getBlocksHomeworksByCourseId(courseId);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateBlockDto: UpdateBlockDto,
  ): Promise<ResData<Block>> {
    return await this.blockService.update(id, updateBlockDto);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Block>> {
    return await this.blockService.delete(id);
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post("recalculate-count-videos/:id")
  async recalculateCountVideos(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<string>> {
    return await this.blockService.recalculateCountVideos(id);
  }
}
