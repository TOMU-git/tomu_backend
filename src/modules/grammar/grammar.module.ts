import { Module } from '@nestjs/common';
import { GrammarService } from './grammar.service';
import { GrammarController } from './grammar.controller';
import { Grammar } from './entities/grammar.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GrammarRepository } from './grammar.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Grammar])],
  controllers: [GrammarController],
  providers: [
    { provide: 'IGrammarService', useClass: GrammarService },
    { provide: 'IGrammarRepository', useClass: GrammarRepository },
  ],
})
export class GrammarModule {}
