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
import { ResData } from 'src/lib/resData';
import { ApiTags } from '@nestjs/swagger';
import { IFeedbackService } from '../feedback/interfaces/feedback.service';
import { CreateFeedbackDto } from '../feedback/dto/create-feedback.dto';
import { Feedback } from '../feedback/entities/feedback.entity';
import { UpdateFeedbackDto } from '../feedback/dto/update-feedback.dto';

@ApiTags('feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(
    @Inject('IFeedbackService')
    private readonly feedbackService: IFeedbackService,
  ) {}

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

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: ID,
    @Body() updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<ResData<Feedback>> {
    return await this.feedbackService.update(id, updateFeedbackDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: ID): Promise<ResData<Feedback>> {
    return await this.feedbackService.delete(id);
  }
}
