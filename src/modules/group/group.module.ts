import { Module, forwardRef } from '@nestjs/common';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { GroupRepository } from './group.repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Group } from './entities/group.entity';
import { GroupTelegramMember } from './entities/group-telegram-member.entity';
import { GroupCronService } from './services/group-cron.service';
import { UserModule } from '../user/user.module';
import { CourseModule } from '../course/course.module';
import { LectureModule } from '../lecture/lecture.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Group, GroupTelegramMember]),
    UserModule,
    CourseModule,
    forwardRef(() => LectureModule),
  ],
  controllers: [GroupController],
  providers: [
    { provide: "IGroupService", useClass: GroupService },
    { provide: "IGroupRepository", useClass: GroupRepository },
    GroupCronService,
  ],
  exports: [
    "IGroupService",
    "IGroupRepository",
  ],
})
export class GroupModule { }

