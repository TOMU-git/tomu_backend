import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { IGroupService } from './interfaces/group.service';
import { IGroupRepository } from './interfaces/group.repository';
import { ResData } from 'src/lib/resData';
import { Group } from './entities/group.entity';
import { GroupTelegramMember } from './entities/group-telegram-member.entity';
import { ID } from 'src/common/types/type';
import { GroupNotFoundException } from './exception/group.exception';
import { GenderEnum } from 'src/common/enums/enum';
import { GroupStatusEnum } from 'src/common/enums/group-status.enum';

@Injectable()
export class GroupService implements IGroupService {
  private readonly logger = new Logger(GroupService.name);

  constructor(
    @Inject("IGroupRepository")
    private readonly groupRepository: IGroupRepository,
    @Inject("IUserRepository")
    private readonly userRepository: any,
    @Inject("ICourseRepository")
    private readonly courseRepository: any,
    @Inject("ILectureService")
    private readonly lectureService: any,
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

  async addStudentToGroup(userId: ID, courseId: number): Promise<ResData<Group>> {

    // User already in group (faollashtirish kerak, quyidagi muhim logika, commentda qolib ketmasin)

    // const existingGroup = await this.groupRepository.findByUserId(userId);
    // if (existingGroup) {
    //   throw new Error('User already in group');
    // }

    // User va Course mavjudligini tekshirish
    const user = await this.userRepository.findOneById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const course = await this.courseRepository.findById(courseId);
    if (!course) {
      throw new NotFoundException('Course not found');
    }


    // Jinsni tekshirish (Guruhlar jinsga qarab ajratilgan)
    if (!user.gender) {
      throw new Error('Talabalaning jinsi belgilanmagan. Guruhga qo\'shish uchun jins talab qilinadi.');
    }

    // Mos guruhni topish yoki yaratish
    let group = await this.groupRepository.findAvailableGroup(courseId, user.gender);

    if (!group) {
      // Yangi guruh yaratamiz
      const groupName = await this.getNextGroupName(courseId, user.gender);
      const createDto: CreateGroupDto = {
        name: groupName,
        gender: user.gender,
        courseId,
        maxStudents: 12,
      };
      const result = await this.create(createDto);
      group = result.data;
    } else {
      this.logger.log(`[INFO] Found available group: ${group.name} (ID: ${group.id}) - Current students: ${group.studentsCount}`);
    }

    // Userni guruhga qo'shamiz
    user.group = group;
    await this.userRepository.update(user);

    // Guruh o'quvchilar sonini oshiramiz
    const updatedGroup = await this.groupRepository.incrementStudentCount(group.id);

    return new ResData<Group>('Student added to group successfully', 200, updatedGroup);
  }

  async getNextGroupName(courseId: number, gender: GenderEnum): Promise<string> {
    const course = await this.courseRepository.findById(courseId);
    const existingGroups = await this.groupRepository.findByCourseIdAndGender(courseId, gender);

    const genderLabel = gender === GenderEnum.MALE ? 'E' : 'A';
    const courseName = course.title;

    // Tartib raqamini hisoblash
    const maxNumber = existingGroups.reduce((max, group) => {
      const match = group.name.match(/^(\d+)([a-z]+)/);
      if (match) {
        const num = parseInt(match[1]);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const number = maxNumber > 0 ? maxNumber : 1;
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const letterIndex = existingGroups.filter(g => g.name.startsWith(`${number}`)).length;
    const letter = letters[letterIndex] || 'a';

    return `${number}${letter}-${courseName}-${genderLabel}`;
  }


  async startGroupsIfReady(): Promise<ResData<void>> {
    const groupsToStart = await this.groupRepository.findGroupsToStart();

    for (const group of groupsToStart) {
      // Har bir guruh uchun darslar yaratish
      await this.lectureService.createLecturesForGroup(group.id);

      // Guruh  statusini ACTIVE ga o'zgartirish
      group.status = GroupStatusEnum.ACTIVE;
      await this.groupRepository.update(group);
    }

    return new ResData<void>(`${groupsToStart.length} groups started successfully`, 200, null);
  }

  async getTelegramMembers(groupId: ID): Promise<ResData<GroupTelegramMember[]>> {
    const foundGroup = await this.groupRepository.findById(groupId);
    if (!foundGroup) {
      throw new GroupNotFoundException();
    }
    const members = await this.groupRepository.findTelegramMembers(groupId);
    return new ResData<GroupTelegramMember[]>("Group telegram members found", 200, members);
  }
}

