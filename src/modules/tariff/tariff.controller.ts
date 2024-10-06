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
import { TariffService } from './tariff.service';
import { CreateTariffDto } from './dto/create-tariff.dto';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { ApiTags } from '@nestjs/swagger';
import { ITariffService } from './interface/tariff.service';

@ApiTags('tariff')
@Controller('tariff')
export class TariffController {
  constructor(
    @Inject('ITariffService') private readonly tariffService: ITariffService,
  ) {}

  @Post()
  create(@Body() createTariffDto: CreateTariffDto) {
    return this.tariffService.create(createTariffDto);
  }

  @Get()
  findAll() {
    return this.tariffService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tariffService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTariffDto: UpdateTariffDto) {
    return this.tariffService.update(+id, updateTariffDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.tariffService.delete(+id);
  }
}
