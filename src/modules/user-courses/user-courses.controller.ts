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
  UseGuards,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateUserCourseDto } from "./dto/create-user-course.dto";
import { UpdateUserCourseDto } from "./dto/update-user-course.dto";
import { ResData } from "src/lib/resData";
import { UserCourse } from "./entities/user-course.entity";
import { IUserCourseService } from "./interfaces/user-course.service";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../shared/guards/auth.guard";
import { RolesGuard } from "../shared/guards/role.guard";
import { RoleEnum } from "src/common/enums/enum";
import { Roles } from "../auth/decorator/role.decorator";

@ApiTags("user-course")
@Controller("user-course")
export class UserCoursesController {
  constructor(
    @Inject("IUserCourseService")
    private readonly userCourseService: IUserCourseService,
  ) {}

  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Post()
  async create(
    @Body() createUserCourseDto: CreateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.create(createUserCourseDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<UserCourse>>> {
    return await this.userCourseService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateUserCourseDto: UpdateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.update(id, updateUserCourseDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Delete(":id")
  async remove(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.delete(id);
  }
}
