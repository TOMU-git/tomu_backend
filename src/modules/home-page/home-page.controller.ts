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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateHomePageDto } from './dto/create-home-page.dto';
import { ResData } from 'src/lib/resData';
import { HomePage } from './entities/home-page.entity';
import { IHomePageService } from './interfaces/home-page.service';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { Roles } from '../auth/decorator/role.decorator';
import { RoleEnum } from 'src/common/enums/enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileOption } from 'src/lib/file';

@ApiTags('home-page')
@Controller('home-page')
export class HomePageController {
  constructor(
    @Inject('IHomePageService')
    private readonly homePageService: IHomePageService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  @UseInterceptors(FileInterceptor('fileName', fileOption))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Yozuvchi va Ularning Ijodi' },
        description: {
          type: 'string',
          example:
            'Bu yerda yozuvchilar va ularning ijodi haqida ma’lumotlar beriladi.',
        },
        fileName: {
          type: 'string',
          format: 'binary',
          description: 'Rasm yoki fayl yuklash',
        },
        preferences: {
          type: 'array',
          items: { type: 'string' },
          example: ['afzallik1', 'afzallik2'],
        },
      },
    },
  })
  @ApiConsumes('multipart/form-data') // Swagger'da fayl yuklashni ko'rsatish uchun
  async create(
    @Body() createHomePageDto: CreateHomePageDto,
    @UploadedFile() file: Express.Multer.File, // Faylni qabul qilish
  ): Promise<ResData<HomePage>> {
    console.log(file, createHomePageDto);
    return await this.homePageService.create(createHomePageDto, file);
  }

  @Get()
  async findAll(): Promise<ResData<Array<HomePage>>> {
    return await this.homePageService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<HomePage>> {
    return await this.homePageService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateHomePageDto: CreateHomePageDto,
  ): Promise<ResData<HomePage>> {
    return await this.homePageService.update(id, updateHomePageDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<HomePage>> {
    return await this.homePageService.delete(id);
  }
}
