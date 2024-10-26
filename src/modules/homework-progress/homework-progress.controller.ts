import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Inject,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { ResData } from "src/lib/resData";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "./dto/create-homework-progress.dto";

@ApiTags("homework-progress")
@Controller("homework-progress")
export class HomeworkProgressController {
  constructor(
    @Inject("IHomeworkProgressService")
    private readonly homeworkProgressService: IHomeworkProgressService,
  ) {}

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Post()
  async create(
    @Body() createHomeworkProgressDto: CreateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.create(createHomeworkProgressDto);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get()
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findAll();
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.findOneById(id);
  }
}
