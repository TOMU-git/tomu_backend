import { Injectable } from "@nestjs/common";
import { IGroupRepository } from "./interfaces/group.repository";
import { Group } from "./entities/group.entity";
import { ID } from "src/common/types/type";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class GroupRepository implements IGroupRepository {
    constructor(
        @InjectRepository(Group)
        private readonly groupRepository: Repository<Group>,
    ) {}
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
    
}   