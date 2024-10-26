import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Inject,
} from "@nestjs/common";
import { ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { fileOption } from "src/lib/file";
import { IFileService } from "./interfaces/file.service";

@ApiTags("file")
@Controller("file")
export class FileController {
  constructor(
    @Inject("IFileService")
    private readonly fileService: IFileService,
  ) {}

  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
      required: ["file"],
    },
  })
  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", fileOption))
  async create(@UploadedFile() file: Express.Multer.File) {
    return await this.fileService.create(file);
  }
  @Get()
  findAll() {
    return this.fileService.findAll();
  }

  @Delete(":id")
  remove(@Param("id") id: number) {
    return this.fileService.remove(id);
  }
}
