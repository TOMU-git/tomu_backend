import { Controller, Get, Param, ParseIntPipe } from "@nestjs/common";
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
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<any> {
    return await this.userProgressService.getProgressData(id);
  }
}
