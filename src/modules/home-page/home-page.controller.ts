import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { HomePageService } from './home-page.service';
import { CreateHomePageDto } from './dto/create-home-page.dto';
import { UpdateHomePageDto } from './dto/update-home-page.dto';

@Controller('home-page')
export class HomePageController {
  constructor(private readonly homePageService: HomePageService) {}

  @Post()
  create(@Body() createHomePageDto: CreateHomePageDto) {
    return this.homePageService.create(createHomePageDto);
  }

  @Get()
  findAll() {
    return this.homePageService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.homePageService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateHomePageDto: UpdateHomePageDto) {
    return this.homePageService.update(+id, updateHomePageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.homePageService.remove(+id);
  }
}
