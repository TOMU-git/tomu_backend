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
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateHomePageDto } from './dto/create-home-page.dto';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
import { ResData } from 'src/lib/resData';
import { HomePage } from './entities/home-page.entity';
import { IHomePageService } from './interfaces/home-page.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('home-page')
@Controller('home-page')
export class HomePageController {
  constructor(
    @Inject('IHomePageService')
    private readonly homePageService: IHomePageService,
  ) {}

  @Post()
  async create(
    @Body() createHomePageDto: CreateHomePageDto,
  ): Promise<ResData<HomePage>> {
    return await this.homePageService.create(createHomePageDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<HomePage>>> {
    return await this.homePageService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<HomePage>> {
    return await this.homePageService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateHomePageDto: UpdateHomePageDto,
  ): Promise<ResData<HomePage>> {
    return await this.homePageService.update(id, updateHomePageDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<HomePage>> {
    return await this.homePageService.delete(id);
  }
}
