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
  BadRequestException,
  UseGuards,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateCourseDto } from "./dto/create-course.dto";
import { UpdateCourseDto } from "./dto/update-course.dto";
import { ResData } from "src/lib/resData";
import { ICourseService } from "./interfaces/course.service";
import { ApiBody, ApiConsumes, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { fileOption } from "src/lib/file";
import { Auth } from "src/common/decorator/auth.decorator";
import { Course } from "./entities/course.entity";
import { CurrentUser } from "src/common/decorator/CurrentUser.decorator";
import { User } from "../user/entities/user.entity";
import { OptionalAuthGuard } from "../shared/guards/optional-auth.guard";

@ApiTags("course")
@Controller("course")
export class CourseController {
  constructor(
    @Inject("ICourseService")
    private readonly courseService: ICourseService,
  ) { }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Post()
  @Post("upload")
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
        videoUrl: {
          type: "string",
          example: "",
        },
      },
    },
  })
  @ApiConsumes("multipart/form-data") // Swagger'da fayl yuklashni ko'rsatish uchun
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ResData<Course>> {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    return await this.courseService.create(createCourseDto, file);
  }

  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @Get()
  async findAll(
    @CurrentUser() user?: User,
  ): Promise<ResData<Array<Course & { alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number; isActiveForUser: boolean; subscriptionStatus: string; startedAt: Date | null; endedAt: Date | null }>>> {
    return await this.courseService.findAll(user);
  }

  @UseGuards(OptionalAuthGuard)
  @ApiBearerAuth()
  @Get(":id")
  async findOne(
    @Param("id", ParseIntPipe) id: ID,
    @CurrentUser() user?: User,
  ): Promise<ResData<Course & { isActiveForUser: boolean; subscriptionStatus: string; alphabetCount: number; lessonCount: number; grammarCount: number; homeworkCount: number }>> {
    console.log('[CourseController.findOne] Request received - Course ID:', id, 'User:', user ? `ID: ${user.id}, Email/Phone: ${user.phoneNumber || 'N/A'}` : 'NOT AUTHENTICATED');
    const result = await this.courseService.findOneById(id, user);
    console.log('[CourseController.findOne] Response - isActiveForUser:', result.data?.isActiveForUser);
    return result;
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
        videoUrl: {
          type: "string",
          example: "",
        },
        fileName: {
          type: "string",
          format: "binary",
        },
        isActive: {
          type: "boolean"
        },
        lang: {
          type: "string",
          example: "ar",
          description: "Kursning qaysi tilda mavjudligi"
        },
      },
    },
  })
  @ApiConsumes("multipart/form-data") // Swagger'da fayl yuklashni ko'rsatish uchun
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @UploadedFile() file: Express.Multer.File, // Faylni qabul qilish
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<ResData<Partial<Course>>> {
    return await this.courseService.update(id, updateCourseDto, file);
  }

  @Auth(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Course>> {
    return await this.courseService.delete(id);
  }
}
