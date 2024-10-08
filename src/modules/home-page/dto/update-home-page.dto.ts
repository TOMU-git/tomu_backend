import { PartialType } from '@nestjs/swagger';
import { CreateHomePageDto } from './create-home-page.dto';

export class UpdateHomePageDto extends PartialType(CreateHomePageDto) {}
