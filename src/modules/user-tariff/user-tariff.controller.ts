import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Inject,
} from '@nestjs/common';
import { UserTariffService } from './user-tariff.service';
import { CreateUserTariffDto } from './dto/create-user-tariff.dto';
import { UpdateUserTariffDto } from './dto/update-user-tariff.dto';
import { IUserTariffService } from './interfaces/user-tariff.service';

@Controller('user-tariff')
export class UserTariffController {
  constructor(
    @Inject('IUserTariffService')
    private readonly userTariffService: IUserTariffService,
  ) {}

  @Post()
  create(@Body() createUserTariffDto: CreateUserTariffDto) {
    return this.userTariffService.create(createUserTariffDto);
  }

  @Get()
  findAll() {
    return this.userTariffService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userTariffService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserTariffDto: UpdateUserTariffDto,
  ) {
    return this.userTariffService.update(+id, updateUserTariffDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.userTariffService.delete(+id);
  }
}
