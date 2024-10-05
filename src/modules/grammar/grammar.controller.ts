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
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { ResData } from 'src/lib/resData';
import { Grammar } from './entities/grammar.entity';
import { IGrammarService } from './interfaces/grammar.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('grammar')
@Controller('grammar')
export class GrammarController {
  constructor(
    @Inject('IGrammarService')
    private readonly grammarService: IGrammarService,
  ) {}

  @Post()
  async create(
    @Body() createGrammarDto: CreateGrammarDto,
  ): Promise<ResData<Grammar>> {
    return await this.grammarService.create(createGrammarDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Grammar>>> {
    return await this.grammarService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.findOneById(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateGrammarDto: UpdateGrammarDto,
  ): Promise<ResData<Grammar>> {
    return await this.grammarService.update(id, updateGrammarDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.delete(id);
  }
}
