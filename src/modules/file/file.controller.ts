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
    console.log(file);
    let newFile = new CreateFileDto();
    newFile = Object.assign(newFile, file);
    return this.fileService.create(newFile);
  }

  @Post('upload-multiple')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        ['file']: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('file', 2, fileOption))
  multipleCreate(@UploadedFiles() files: Array<Express.Multer.File>) {
    console.log(files);
    const newFile = new CreateFileDto();
    const data1 = {
      path: files[0].path,
      originalname: files[0].originalname,
      mimetype: files[0].mimetype,
      size: files[0].size,
    };
    const data2 = {
      path: files[1].path,
      originalname: files[1].originalname,
      mimetype: files[1].mimetype,
      size: files[1].size,
    };
    console.log(files);
    const newFile1 = Object.assign(newFile, data1);
    const newFile2 = Object.assign(newFile, data2);
    return this.fileService.multipleCreate(newFile1, newFile2);
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
