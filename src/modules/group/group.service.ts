import { Inject, Injectable } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { IGroupService } from './interfaces/group.service';
import { IGroupRepository } from './interfaces/group.repository';
import { ResData } from 'src/lib/resData';
import { Group } from './entities/group.entity';
import { ID } from 'src/common/types/type';
import { GroupNotFoundException } from './exception/group.exception';

@Injectable()
export class GroupService implements IGroupService {
  constructor(
    @Inject("IGroupRepository")
    private readonly groupRepository: IGroupRepository
  ) { }

  async create(createGroupDto: CreateGroupDto): Promise<ResData<Group>> {
    const newGroup = new Group();
    Object.assign(newGroup, createGroupDto);
    const created = await this.groupRepository.create(newGroup);
    return new ResData<Group>("Group created successfully", 201, created);
  }

  async findAll(): Promise<ResData<Array<Group>>> {
    const data = await this.groupRepository.findAll();
    return new ResData<Array<Group>>("All groups", 200, data);
  }

  async findOne(id: ID): Promise<ResData<Group>> {
    const foundData = await this.groupRepository.findById(id);
    if (!foundData) {
      throw new GroupNotFoundException();
    }
    return new ResData<Group>("Group found", 200, foundData);
  }

  async update(id: ID, updateGroupDto: UpdateGroupDto): Promise<ResData<Group>> {
    const foundData = await this.groupRepository.findById(id);
    if (!foundData) {
      throw new GroupNotFoundException();
    }
    Object.assign(foundData, updateGroupDto);
    const updated = await this.groupRepository.update(foundData);
    return new ResData<Group>("Group updated successfully", 200, updated);
  }

  async remove(id: ID): Promise<ResData<Group>> {
    const foundData = await this.groupRepository.findById(id);
    if (!foundData) {
      throw new GroupNotFoundException();
    }
    const deleted = await this.groupRepository.delete(foundData);
    return new ResData<Group>("Group deleted successfully", 200, deleted);
  }
}
