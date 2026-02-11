import { Module } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { GroupRepository } from './group.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Group])],
  controllers: [GroupController],
    providers: [
      { provide: "IGroupService", useClass: GroupService },
      { provide: "IGroupRepository", useClass: GroupRepository },
    ],
})
export class GroupModule {}
