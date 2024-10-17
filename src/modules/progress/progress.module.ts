import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Progress } from './entities/progress.entity';
import { ProgressRepository } from './progress.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Progress])],
  controllers: [ProgressController],
  providers: [
    { provide: 'IProgressService', useClass: ProgressService },
    { provide: 'IProgressRepository', useClass: ProgressRepository },
  ],
})
export class ProgressModule {}
