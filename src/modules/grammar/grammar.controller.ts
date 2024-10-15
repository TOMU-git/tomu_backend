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
} from '@nestjs/common';
import { ID } from 'src/common/types/type';
import { CreateGrammarDto } from './dto/create-grammar.dto';
import { UpdateGrammarDto } from './dto/update-grammar.dto';
import { ResData } from 'src/lib/resData';
import { Grammar } from './entities/grammar.entity';
import { IGrammarService } from './interfaces/grammar.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';
import { RolesGuard } from '../shared/guards/role.guard';
import { AuthGuard } from '../shared/guards/auth.guard';
import { Roles } from '../auth/decorator/role.decorator';

@ApiTags('grammar')
@Controller('grammar')
export class GrammarController {
  constructor(
    @Inject('IGrammarService')
    private readonly grammarService: IGrammarService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.TEACHER, RoleEnum.ADMIN)
  @Patch(':id')
  @Post()
  async create(
    @Body() createGrammarDto: CreateGrammarDto,
  ): Promise<ResData<Grammar>> {
    return await this.grammarService.create(createGrammarDto);
  }

  @ApiBearerAuth()
  @Get()
  async findAll(): Promise<ResData<Array<Grammar>>> {
    return await this.grammarService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.TEACHER, RoleEnum.ADMIN, RoleEnum.STUDENT, RoleEnum.DIRECTOR)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.TEACHER, RoleEnum.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateGrammarDto: UpdateGrammarDto,
  ): Promise<ResData<Grammar>> {
    return await this.grammarService.update(id, updateGrammarDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.TEACHER, RoleEnum.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Grammar>> {
    return await this.grammarService.delete(id);
  }
}
