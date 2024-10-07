import { Module } from '@nestjs/common';
import { BlockService } from './block.service';
import { BlockController } from './block.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './entities/block.entity';
import { BlockRepository } from './block.repository';
import { CourseModule } from '../course/course.module';

@Module({
  imports: [TypeOrmModule.forFeature([Block]), CourseModule],
  controllers: [BlockController],
  providers: [
    { provide: 'IBlockService', useClass: BlockService },
    { provide: 'IBlockRepository', useClass: BlockRepository },
  ],
})
export class BlockModule {}
