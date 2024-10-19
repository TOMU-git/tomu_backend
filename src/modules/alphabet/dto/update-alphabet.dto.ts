import { PartialType } from '@nestjs/swagger';
import { CreateAlphabetDto } from './create-alphabet.dto';

export class UpdateAlphabetDto extends PartialType(CreateAlphabetDto) {}
