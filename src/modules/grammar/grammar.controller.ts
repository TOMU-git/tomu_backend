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
  Query,
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { ResData } from 'src/lib/resData';
import { Grammar } from './entities/grammar.entity';
import { IGrammarService } from './interfaces/grammar.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';
import { Auth } from 'src/common/decorator/auth.decorator';

@ApiTags('grammar')
@Controller('grammar')
export class GrammarController {
  constructor(
    @Inject('IGrammarService')
    private readonly grammarService: IGrammarService,
  ) {}

  @Auth(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
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

  @ApiQuery({
    name: 'courseId',
    type: Number,
    required: true,
    description: "Getting grammar by course id"
  })
  @Get('/courseId')
  async findGrammarByCourseId(@Query('courseId') courseId: number): Promise<ResData<Array<Grammar>>> {
    return await this.grammarService.findAll();
  }

  @Auth(RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.findOneById(id);
  }

  @Auth(RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateGrammarDto: UpdateGrammarDto,
  ): Promise<ResData<Grammar>> {
    return await this.grammarService.update(id, updateGrammarDto);
  }

  @Auth(RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.delete(id);
  }
}
