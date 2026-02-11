import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLectureDto } from './dto/create-lecture.dto';
import { UpdateLectureDto } from './dto/update-lecture.dto';
import { ILectureService } from './interfaces/lecture.service';
import { ILectureRepository } from './interfaces/lecture.repository';
import { ResData } from 'src/lib/resData';
import { Lecture } from './entities/lecture.entity';
import { ID } from 'src/common/types/type';
import { ScheduleCalculatorService } from './schedule-calculator.service';
import { LectureStatusEnum } from 'src/common/enums/lecture-status.enum';

@Injectable()
export class LectureService implements ILectureService {
  constructor(
    @Inject('ILectureRepository')
    private readonly lectureRepository: ILectureRepository,
    @Inject('IGroupRepository')
    private readonly groupRepository: any,
    @Inject('IGrammarRepository')
    private readonly grammarRepository: any,
    private readonly scheduleCalculator: ScheduleCalculatorService,
  ) { }
  async create(createLectureDto: CreateLectureDto): Promise<ResData<Lecture>> {
    const newLecture = new Lecture();
    Object.assign(newLecture, createLectureDto);
    const created = await this.lectureRepository.create(newLecture);
    return new ResData<Lecture>('Lecture created successfully', 201, created);
  }

  async findAll(): Promise<ResData<Array<Lecture>>> {
    const data = await this.lectureRepository.findAll();
    return new ResData<Array<Lecture>>('All lectures', 200, data);
  }

  async findOne(id: ID): Promise<ResData<Lecture>> {
    const foundData = await this.lectureRepository.findById(id);
    if (!foundData) {
      throw new NotFoundException('Lecture not found');
    }
    return new ResData<Lecture>('Lecture found', 200, foundData);
  }

  async update(id: ID, updateLectureDto: UpdateLectureDto): Promise<ResData<Lecture>> {
    const foundData = await this.lectureRepository.findById(id);
    if (!foundData) {
      throw new NotFoundException('Lecture not found');
    }
    Object.assign(foundData, updateLectureDto);
    const updated = await this.lectureRepository.update(foundData);
    return new ResData<Lecture>('Lecture updated successfully', 200, updated);
  }

  async remove(id: ID): Promise<ResData<Lecture>> {
    const foundData = await this.lectureRepository.findById(id);
    if (!foundData) {
      throw new NotFoundException('Lecture not found');
    }
    const deleted = await this.lectureRepository.delete(foundData);
    return new ResData<Lecture>('Lecture deleted successfully', 200, deleted);
  }

  async createLecturesForGroup(groupId: ID): Promise<ResData<Lecture[]>> {
    const group = await this.groupRepository.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    // Kurs bo'yicha grammar titlelarni olamiz
    const grammars = await this.grammarRepository.findGrammarsByCourseId(group.courseId);
    const grammarTitles = grammars.map(g => g.title);

    // Darslarni generatsiya qilamiz
    const lectureData = await this.scheduleCalculator.generateLecturesForGroup(
      group,
      grammarTitles,
    );

    // Database ga saqlaymiz
    const lectures = lectureData.map(data => {
      const lecture = new Lecture();
      Object.assign(lecture, data);
      lecture.group = group;
      return lecture;
    });

    const created = await this.lectureRepository.createBulk(lectures);

    return new ResData<Lecture[]>('Lectures created successfully', 201, created);
  }

  async updateInviteLink(lectureId: ID, inviteLink: string): Promise<ResData<Lecture>> {
    const lecture = await this.lectureRepository.findById(lectureId);
    if (!lecture) throw new NotFoundException('Lecture not found');

    lecture.inviteLink = inviteLink;
    lecture.status = LectureStatusEnum.COMPLETED;

    const updated = await this.lectureRepository.update(lecture);
    return new ResData<Lecture>('Invite link updated', 200, updated);
  }

  async findByGroupId(groupId: ID): Promise<ResData<Lecture[]>> {
    const lectures = await this.lectureRepository.findByGroupId(groupId);
    return new ResData<Lecture[]>('Lectures found', 200, lectures);
  }
}
