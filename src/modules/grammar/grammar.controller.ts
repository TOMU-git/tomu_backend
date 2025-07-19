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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
  Req,
} from "@nestjs/common";
import { ID } from "src/common/types/type";
import { CreateGrammarDto } from "./dto/create-grammar.dto";
import { UpdateGrammarDto } from "./dto/update-grammar.dto";
import { ResData } from "src/lib/resData";
import { Grammar } from "./entities/grammar.entity";
import { IGrammarService } from "./interfaces/grammar.service";
import { ApiBody, ApiConsumes, ApiQuery, ApiTags } from "@nestjs/swagger";
import { RoleEnum } from "src/common/enums/enum";
import { FileInterceptor } from "@nestjs/platform-express";
import { Auth } from "src/common/decorator/auth.decorator";

interface RequestWithUser extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}

@ApiTags("grammar")
@Controller("grammar")
export class GrammarController {
  constructor(
    @Inject("IGrammarService")
    private readonly grammarService: IGrammarService,
  ) {}

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan grammatika video ma'lumotlari",
    type: CreateGrammarDto,
    schema: {
      type: "object",
      properties: {
        title: {
          type: "string",
        },
        courseId: {
          type: "number",
        },
        video: {
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async create(
    @Body() createGrammarDto: CreateGrammarDto,
    @UploadedFile() file: Express.Multer.File, // Yuklangan faylni olish
  ): Promise<ResData<Grammar>> {
    if (!file) {
      throw new BadRequestException("Fayl yuklanmadi");
    }
    return this.grammarService.create(createGrammarDto, file); // Yangi grammatikani yaratish
  }

  @Get()
  async findAll(): Promise<ResData<Array<Grammar>>> {
    return await this.grammarService.findAll();
  }
  
  @Auth(RoleEnum.STUDENT, RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Get("/course/:id")
  async findGrammarByCourseId(
    @Param("id", ParseIntPipe) courseId: number,
    @Req() req: RequestWithUser,
  ): Promise<ResData<Array<Grammar>>> {
    const userId = req.user["id"];
    return await this.grammarService.findGrammarByCourseId(courseId, userId);
  }


  // @Auth(RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Get(":id")
  async findOne(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.findOneById(id);
  }

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(":id")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("video")) // 'video' - yuklanayotgan fayl maydoni nomi
  @ApiBody({
    description: "Yuklanadigan video ma'lumotlari va o'zgarishlar",
    type: UpdateGrammarDto,
    schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        courseId: { type: "number" },
        video: {
          type: "string",
          format: "binary", // Bu maydon fayl yuklash uchun kerak
        },
      },
    },
  })
  async update(
    @Param("id", ParseIntPipe) id: ID,
    @Body() updateGrammarDto: UpdateGrammarDto,
    @UploadedFile() file?: Express.Multer.File, // Yuklangan faylni olish (ixtiyoriy)
  ): Promise<ResData<Grammar>> {
    return await this.grammarService.update(id, updateGrammarDto, file);
  }

  // @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(":id")
  async remove(@Param("id", ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.delete(id);
  }
}
