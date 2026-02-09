import { ID } from "src/common/types/type";
import { Group } from "../entities/group.entity";

export interface IGroupRepository {
    create(dto: Group): Promise<Group>;
    findAll(): Promise<Array<Group>>;
    update(entity: Group): Promise<Group>;
    delete(entity: Group): Promise<Group>;
    findById(id: ID): Promise<Group | null>;
}