import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Inject,
  UploadedFiles,
} from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { fileOption } from 'src/lib/file';
import { IFileService } from './interfaces/file.service';

@ApiTags('file')
@Controller('file')
export class FileController {
  constructor(
    @Inject('IFileService')
    private readonly fileService: IFileService,
  ) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' }, // Qo'shimcha input
        description: { type: 'string' }, // Qo'shimcha input
        file: { type: 'string', format: 'binary' }, // Fayl yuklash
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', fileOption))
  create(@UploadedFile() file: Express.Multer.File) {
    let newFile = new CreateFileDto();
    console.log("file :", file);
    newFile = Object.assign(newFile, file);
    console.log("New file: ", newFile);
    return this.fileService.create(newFile);
  }
  @Get()
  findAll() {
    return this.fileService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.fileService.remove(id);
  }
}
