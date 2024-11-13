import { PartialType } from '@nestjs/swagger';
import { CreateUserHomeworkProgressDto } from './create-user-homework-progress.dto';

export class UpdateUserHomeworkProgressDto extends PartialType(CreateUserHomeworkProgressDto) {}
