import { GenderEnum } from "src/common/enums/enum";
import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { CreateGroupDto } from "../dto/create-group.dto";
import { UpdateGroupDto } from "../dto/update-group.dto";
import { Group } from "../entities/group.entity";
import { GroupTelegramMember } from "../entities/group-telegram-member.entity";

export interface IGroupService {
    create(dto: CreateGroupDto): Promise<ResData<Group>>;
    findAll(): Promise<ResData<Array<Group>>>;
    findOne(id: ID): Promise<ResData<Group>>;
    update(id: ID, dto: UpdateGroupDto): Promise<ResData<Group>>;
    remove(id: ID): Promise<ResData<Group>>;
    addStudentToGroup(userId: ID, courseId: number): Promise<ResData<Group>>;
    getNextGroupName(courseId: number, gender: GenderEnum): Promise<string>;
    startGroupsIfReady(): Promise<ResData<void>>;
    getTelegramMembers(groupId: ID): Promise<ResData<GroupTelegramMember[]>>;
}
