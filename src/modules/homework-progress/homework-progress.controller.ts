import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  ParseIntPipe,
  Inject,
  Query,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { ResData } from "src/lib/resData";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { IHomeworkProgressService } from "./interfaces/homework-progress.service";
import { HomeworkProgress } from "./entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "./dto/create-homework-progress.dto";
import { UpdateHomeworkProgressDto } from "./dto/update-homework-progress.dto"; // Yangilash DTO sini import qiling

@ApiTags("homework-progress")
@Controller("homework-progress")
export class HomeworkProgressController {
  constructor(
    @Inject("IHomeworkProgressService")
    private readonly homeworkProgressService: IHomeworkProgressService,
  ) {}

  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Post()
  async create(
    @Body() createHomeworkProgressDto: CreateHomeworkProgressDto,
  ): Promise<ResData<Partial<HomeworkProgress>>> {
    return await this.homeworkProgressService.create(createHomeworkProgressDto);
  }

  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get()
  async findAll(): Promise<ResData<Array<HomeworkProgress>>> {
    return await this.homeworkProgressService.findAll();
  }

  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.findOneById(id);
  }

  // Yangilash uchun metod
  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN) // Kerak bo'lsa, autentifikatsiya qo'shishingiz mumkin
  @Put(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateHomeworkProgressDto: UpdateHomeworkProgressDto, // Yangilash DTO sini oling
  ): Promise<ResData<HomeworkProgress>> {
    return await this.homeworkProgressService.update(
      id,
      updateHomeworkProgressDto,
    );
  }

  // @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("random-videos/:order")
  async getRandomVideos(
    @Param("order", ParseIntPipe) order: ID,
  ): Promise<ResData<Array<HomeworkProgress>>> {
    console.log(order);
    return await this.homeworkProgressService.getRandomVideos(order);
  }

  @Get("check-videos/:order")
  async checkWatchedVideos(
    @Param("order", ParseIntPipe) order: ID,
  ): Promise<ResData<boolean>> {
    return await this.homeworkProgressService.getWatchedHomeworkProgressUpToOrder(
      order,
    );  
  }
}
