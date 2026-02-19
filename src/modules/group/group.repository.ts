import { Injectable, NotFoundException } from "@nestjs/common";
import { IGroupRepository } from "./interfaces/group.repository";
import { Group } from "./entities/group.entity";
import { GroupTelegramMember } from "./entities/group-telegram-member.entity";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThanOrEqual, Repository } from "typeorm";
import { GenderEnum } from "src/common/enums/enum";
import { GroupStatusEnum } from "src/common/enums/group-status.enum";

@Injectable()
export class GroupRepository implements IGroupRepository {
    constructor(
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,
        @InjectRepository(GroupTelegramMember)
        private readonly telegramMemberRepository: Repository<GroupTelegramMember>,
    ) { }

    create(dto: Group): Promise<Group> {
        const newGroup = this.groupRepository.create(dto);
        return this.groupRepository.save(newGroup);
    }

    findAll(): Promise<Array<Group>> {
        return this.groupRepository.find();
    }

    update(entity: Group): Promise<Group> {
        return this.groupRepository.save(entity);
    }

    delete(entity: Group): Promise<Group> {
        return this.groupRepository.remove(entity);
    }

    findById(id: ID): Promise<Group | null> {
        return this.groupRepository.findOneBy({ id });
    }

    async findAvailableGroup(courseId: number, gender: GenderEnum): Promise<Group | null> {
        return await this.groupRepository.findOne({
            where: {
                courseId,
                gender,
                status: GroupStatusEnum.FILLING,
            },
            relations: ['users'],
        });
    }

    async findGroupsToStart(): Promise<Group[]> {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        return await this.groupRepository.find({
            where: {
                status: GroupStatusEnum.WAITING,
                fillAt: LessThanOrEqual(threeDaysAgo),
            },
            relations: ['course', 'users'],
        });
    }

    async incrementStudentCount(groupId: ID): Promise<Group> {
        const group = await this.findById(groupId);
        if (!group) throw new NotFoundException('Group not found');
        group.studentsCount += 1;
        console.log("group.studentsCount", group.studentsCount);

        if (group.studentsCount >= group.maxStudents) {
            group.status = GroupStatusEnum.WAITING;
            console.log("group.status", group.status);
            group.fillAt = new Date();
            console.log("group.fillAt", group.fillAt);

            // startDate ni 3 kun keyingi vaqtga belgilaymiz
            const startDate = new Date();
            startDate.setDate(startDate.getDate() + 3);
            group.startDate = startDate;
            console.log("group.startDate", group.startDate);
        }

        return await this.groupRepository.save(group);
    }

    async findByCourseIdAndGender(courseId: number, gender: GenderEnum): Promise<Group[]> {
        return await this.groupRepository.find({
            where: { courseId, gender },
            order: { createdAt: 'ASC' },
        });
    }

    async findByUserId(userId: ID): Promise<Group | null> {
        return await this.groupRepository.findOne({
            where: { users: { id: userId as any } },
            relations: ['users']
        });
    }

    async findTelegramMembers(groupId: ID): Promise<GroupTelegramMember[]> {
        return await this.telegramMemberRepository.find({
            where: { groupId: groupId as number },
        });
    }

}