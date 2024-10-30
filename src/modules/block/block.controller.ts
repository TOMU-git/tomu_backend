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
  ) {}

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
  @Get('course/homework/:courseId')
  async findAllHomeworkCategory(@Param('courseId', ParseIntPipe) courseId: number): Promise<ResData<Array<Block>>> {
    return await this.blockService.findAllHomeworks(courseId);
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Block>> {
    return await this.blockService.findOneById(id);
  }

  @Get("/course/:courseId")
  async getBlocksByCourseId(
    @Param("courseId", ParseIntPipe) courseId: ID,
  ): Promise<ResData<Block[]>> {
    return this.blockService.getBlocksByCourseId(courseId);
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
}
