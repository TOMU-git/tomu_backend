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
import { ResData } from 'src/lib/resData';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IFeedbackService } from '../feedback/interfaces/feedback.service';
import { CreateFeedbackDto } from '../feedback/dto/create-feedback.dto';
import { Feedback } from '../feedback/entities/feedback.entity';
import { UpdateFeedbackDto } from '../feedback/dto/update-feedback.dto';
import { AuthGuard } from '../shared/guards/auth.guard';
import { RolesGuard } from '../shared/guards/role.guard';
import { RoleEnum } from 'src/common/enums/enum';
import { Roles } from '../auth/decorator/role.decorator';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(
    @Inject('IFeedbackService')
    private readonly feedbackService: IFeedbackService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.STUDENT)
  @Post()
  async create(
    @Body() createFeedbackDto: CreateFeedbackDto,
  ): Promise<ResData<Feedback>> {
    return await this.feedbackService.create(createFeedbackDto);
  }

  @Get()
  async findAll(): Promise<ResData<Feedback[]>> {
    return await this.feedbackService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Feedback>> {
    return await this.feedbackService.findOneById(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<ResData<Feedback>> {
    return await this.feedbackService.update(id, updateFeedbackDto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.STUDENT, RoleEnum.ADMIN)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Feedback>> {
    return await this.feedbackService.delete(id);
  }
}
