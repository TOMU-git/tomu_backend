import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Inject,
  Query,
  Patch,
  Req,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { ResData } from "src/lib/resData";
import { LessonProgress } from "./entities/lesson-progress.entity";
import { ILessonProgressService } from "./interfaces/lesson-progress.service";
import { ApiTags } from "@nestjs/swagger";
import { Auth } from "src/common/decorator/auth.decorator";
import { RoleEnum } from "src/common/enums/enum";
import { UpdateLessonProgressDto } from "./dto/update-lesson-progress.dto";

// Define a custom interface that extends Express Request
interface RequestWithUser extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}


@ApiTags("lesson-progress")
@Controller("lesson-progress")
export class LessonProgressController {
  constructor(
    @Inject("ILessonProgressService")
    private readonly lessonProgressService: ILessonProgressService,
  ) {}




  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get()
  async findAll(): Promise<ResData<Array<LessonProgress>>> {
    return await this.lessonProgressService.findAll();
  }
  
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get("get-videos")
  async getVideos(
    @Req() req: RequestWithUser,
    @Query("blockId", ParseIntPipe) blockId: ID,
  ): Promise<ResData<Array<LessonProgress>>> {
    const userId = req.user["id"];
    return await this.lessonProgressService.getVideos(userId, blockId);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.findOneById(id);
  }
  
  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.TEACHER)
  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<LessonProgress>> {
    return await this.lessonProgressService.update(id);
  }
}
