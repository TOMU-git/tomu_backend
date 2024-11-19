import { Controller, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { UserProgressService } from "./user-progress.service";
import { ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { Auth } from "src/common/decorator/auth.decorator";
import { ID } from "src/common/types/type";

@ApiTags("user-progress")
@Controller("user-progress")
export class UserProgressController {
  constructor(private readonly userProgressService: UserProgressService) {}

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(
    @Query("userId", ParseIntPipe) userId: ID,
    @Query("courseId", ParseIntPipe) courseId: ID
  
  ): Promise<any> {
    return await this.userProgressService.getProgressData(userId, courseId);
  }
}
