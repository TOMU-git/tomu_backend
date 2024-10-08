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
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { ResData } from 'src/lib/resData';
import { Homework } from './entities/homework.entity';
import { IHomeworkService } from './interfaces/homework.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { RoleEnum } from 'src/common/enums/enum';
import { Roles } from '../auth/decorator/role.decorator';

@ApiTags('homework')
@Controller('homework')
export class HomeworkController {
  constructor(
    @Inject('IHomeworkService')
    private readonly homeworkService: IHomeworkService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Post()
  async create(
    @Body() createHomeworkDto: CreateHomeworkDto,
  ): Promise<ResData<Homework>> {
    return await this.homeworkService.create(createHomeworkDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get()
  async findAll(): Promise<ResData<Array<Homework>>> {
    return await this.homeworkService.findAll();
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR, RoleEnum.STUDENT)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Homework>> {
    return await this.homeworkService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateHomeworkDto: UpdateHomeworkDto,
  ): Promise<ResData<Homework>> {
    return await this.homeworkService.update(id, updateHomeworkDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.DIRECTOR)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Homework>> {
    return await this.homeworkService.delete(id);
  }
}
