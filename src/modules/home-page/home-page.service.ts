import { Injectable } from '@nestjs/common';
import { CreateHomePageDto } from './dto/create-home-page.dto';
import { UpdateHomePageDto } from './dto/update-home-page.dto';

@Injectable()
export class HomePageService {
  create(createHomePageDto: CreateHomePageDto) {
    return 'This action adds a new homePage';
  }

  findAll() {
    return `This action returns all homePage`;
  }

  findOne(id: number) {
    return `This action returns a #${id} homePage`;
  }

  update(id: number, updateHomePageDto: UpdateHomePageDto) {
    return `This action updates a #${id} homePage`;
  }

  remove(id: number) {
    return `This action removes a #${id} homePage`;
  }
}
