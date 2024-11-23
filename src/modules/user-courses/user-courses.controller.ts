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
  Query,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateUserCourseDto } from "./dto/create-user-course.dto";
import { UpdateUserCourseDto } from "./dto/update-user-course.dto";
import { ResData } from "src/lib/resData";
import { UserCourse } from "./entities/user-course.entity";
import { IUserCourseService } from "./interfaces/user-course.service";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "../shared/guards/auth.guard";
import { RolesGuard } from "../shared/guards/role.guard";
import { RoleEnum } from "src/common/enums/enum";
import { Roles } from "../auth/decorator/role.decorator";
import { Auth } from "src/common/decorator/auth.decorator";

@ApiTags("user-course")
@Controller("user-course")
export class UserCoursesController {
  constructor(
    @Inject("IUserCourseService")
    private readonly userCourseService: IUserCourseService,
  ) {}

 @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Post()
  async create(
    @Body() createUserCourseDto: CreateUserCourseDto,
  ): Promise<ResData<Partial<UserCourse>>> {
    return await this.userCourseService.create(createUserCourseDto);
  }

 @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<UserCourse>>> {
    return await this.userCourseService.findAll();
  }

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @ApiQuery({
    name: 'day',
    type: String,
    description: "should be like this format 'YYYY-MM-DD'",
  })
    
  @ApiQuery({
    name: 'courseId',
    type: Number,
    description: "course id",
    })
  @Get('day/:id')
  async checkEndedDate(@Param('id', ParseIntPipe) id: number, @Query('day') day: Date, @Query('courseId') courseId: number) {
    return await this.userCourseService.findByDate(id , day, courseId);
  }

 @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.findOneById(id);
  }

 @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get("user/:id/courses")
  async findByUserId(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<Array<UserCourse>>> {
    return await this.userCourseService.findOneByUserId(id);
  }

 @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Patch(":id")
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateUserCourseDto: UpdateUserCourseDto,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.update(id, updateUserCourseDto);
  }

 @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Delete(":id")
  async remove(
    @Param("id", ParseIntPipe) id: ID,
  ): Promise<ResData<UserCourse>> {
    return await this.userCourseService.delete(id);
  }
}
