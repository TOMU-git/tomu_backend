import { PartialType } from '@nestjs/swagger';
import { CreateHomeworkProgressDto } from './create-homework-progress.dto';

export class UpdateHomeworkProgressDto extends PartialType(CreateHomeworkProgressDto) {}
