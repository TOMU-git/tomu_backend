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
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { ResData } from 'src/lib/resData';
import { Block } from './entities/block.entity';
import { IBlockService } from './interfaces/block.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RoleEnum } from 'src/common/enums/enum';
import { Roles } from '../auth/decorator/role.decorator';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';

@ApiTags('block')
@Controller('block')
export class BlockController {
  constructor(
    @Inject('IBlockService')
    private readonly blockService: IBlockService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Post()
  async create(
    @Body() createBlockDto: CreateBlockDto,
  ): Promise<ResData<Block>> {
    return await this.blockService.create(createBlockDto);
  }

  @Get()
  async findAll(): Promise<ResData<Array<Block>>> {
    return await this.blockService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Block>> {
    return await this.blockService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateBlockDto: UpdateBlockDto,
  ): Promise<ResData<Block>> {
    return await this.blockService.update(id, updateBlockDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.DIRECTOR, RoleEnum.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Block>> {
    return await this.blockService.delete(id);
  }
}
