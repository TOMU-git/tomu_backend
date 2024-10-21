import { Injectable, Inject } from '@nestjs/common';
import { IFeedbackRepository } from './interfaces/feedback.repository';
import { ResData } from 'src/lib/resData';
import { ID } from 'src/common/types/type';
import { FeedbackNotFoundException } from './exception/feedback.exception';
import { IFeedbackService } from './interfaces/feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './entities/feedback.entity';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbackService implements IFeedbackService {
  constructor(
    @Inject('IFeedbackRepository')
    private readonly feedbackRepository: IFeedbackRepository,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
  ): Promise<ResData<Feedback>> {
    const newFeedback = new Feedback();
    newFeedback.courseId = Number(createFeedbackDto.course);
    newFeedback.userId = Number(createFeedbackDto.user);
    Object.assign(newFeedback, createFeedbackDto);
    const savedFeedback = await this.feedbackRepository.create(newFeedback);

    return new ResData<Feedback>(
      'Feedback created successfully',
      201,
      savedFeedback,
    );
  }

  async findAll(): Promise<ResData<Feedback[]>> {
    const feedbacks = await this.feedbackRepository.findAll();

    return new ResData<Feedback[]>('ok', 200, feedbacks);
  }

  async findOneById(id: ID): Promise<ResData<Feedback>> {
    const foundFeedback = await this.feedbackRepository.findById(id);
    if (!foundFeedback) {
      throw new FeedbackNotFoundException();
    }

    return new ResData<Feedback>('ok', 200, foundFeedback);
  }

  async update(
    id: ID,
    updateFeedbackDto: UpdateFeedbackDto,
  ): Promise<ResData<Feedback>> {
    const { data: foundFeedback } = await this.findOneById(id);
    const updatedFeedback = Object.assign(foundFeedback, updateFeedbackDto);
    const savedFeedback = await this.feedbackRepository.update(updatedFeedback);

    return new ResData<Feedback>(
      'Feedback updated successfully',
      200,
      savedFeedback,
    );
  }

  async delete(id: ID): Promise<ResData<Feedback>> {
    const { data: foundFeedback } = await this.findOneById(id);
    const deletedFeedback = await this.feedbackRepository.delete(foundFeedback);

    return new ResData<Feedback>(
      'Feedback deleted successfully',
      200,
      deletedFeedback,
    );
  }
}
