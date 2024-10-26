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
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { ResData } from "src/lib/resData";
import { ICourseService } from "./interfaces/course.service";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { fileOption } from "src/lib/file";
import { Auth } from "src/common/decorator/auth.decorator";
import { Course } from "./entities/course.entity";

@ApiTags("course")
@Controller("course")
export class CourseController {
  constructor(
    @Inject("ICourseService")
    private readonly courseService: ICourseService,
  ) {}

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Post()
  @UseInterceptors(FileInterceptor("fileName", fileOption))
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", example: "Introduction to Programming" },
        description: {
          type: "string",
          example: "This course covers the basics of programming using Python.",
        },
        fileName: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiConsumes("multipart/form-data") // Swagger'da fayl yuklashni ko'rsatish uchun
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() file: Express.Multer.File, // Faylni qabul qilish
  ): Promise<ResData<Course>> {
    return await this.courseService.create(createCourseDto, file);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Course>>> {
    return await this.courseService.findAll();
  }

  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.findOneById(id);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Patch(":id")
  @UseInterceptors(FileInterceptor("fileName", fileOption))
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        title: { type: "string", example: "Introduction to Programming" },
        description: {
          type: "string",
          example: "This course covers the basics of programming using Python.",
        },
        fileName: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiConsumes("multipart/form-data") // Swagger'da fayl yuklashni ko'rsatish uchun
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @UploadedFile() file: Express.Multer.File, // Faylni qabul qilish
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<ResData<Course>> {
    return await this.courseService.update(id, updateCourseDto, file);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.delete(id);
  }
}
