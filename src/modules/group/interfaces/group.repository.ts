import { GenderEnum } from "src/common/enums/enum";
import { ID } from "src/common/types/type";
import { Group } from "../entities/group.entity";

export interface IGroupRepository {
    create(dto: Group): Promise<Group>;
    findAll(): Promise<Array<Group>>;
    update(entity: Group): Promise<Group>;
    delete(entity: Group): Promise<Group>;
    findById(id: ID): Promise<Group | null>;
    findAvailableGroup(courseId: number, gender: GenderEnum): Promise<Group | null>;
    findGroupsToStart(): Promise<Group[]>;
    incrementStudentCount(groupId: ID): Promise<Group>;
    findByCourseIdAndGender(courseId: number, gender: GenderEnum): Promise<Group[]>;
}