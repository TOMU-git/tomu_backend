import { Injectable, NotFoundException } from "@nestjs/common";
import { ILectureRepository } from "./interfaces/lecture.repository";
import { ID } from "src/common/types/type";
import { Lecture } from "./entities/lecture.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Between, LessThan, LessThanOrEqual, MoreThan, Repository } from "typeorm";
import { LectureStatusEnum } from "src/common/enums/lecture-status.enum";

@Injectable()
export class LectureRepository implements ILectureRepository {
    constructor(
        @InjectRepository(Lecture)
        private readonly lectureRepository: Repository<Lecture>,
    ) { }

    create(dto: Lecture): Promise<Lecture> {
        const newLecture = this.lectureRepository.create(dto);
        return this.lectureRepository.save(newLecture);
    }

    async createBulk(lectures: Lecture[]): Promise<Lecture[]> {
        return await this.lectureRepository.save(lectures);
    }

    findAll(): Promise<Array<Lecture>> {
        return this.lectureRepository.find();
    }

    update(entity: Lecture): Promise<Lecture> {
        return this.lectureRepository.save(entity);
    }

    delete(entity: Lecture): Promise<Lecture> {
        return this.lectureRepository.remove(entity);
    }

    findById(id: ID): Promise<Lecture | null> {
        return this.lectureRepository.findOne({
            where: { id: id as any },
            relations: ['group', 'group.users', 'assignedTeacher'],
        });
    }

    async findByGroupId(groupId: ID): Promise<Lecture[]> {
        return await this.lectureRepository.find({
            where: { group: { id: groupId } },
            order: { order: 'ASC' },
            relations: ['assignedTeacher', 'group'],
        });
    }

    async findUpcomingByGroupId(groupId: ID): Promise<Lecture | null> {
        return await this.lectureRepository.findOne({
            where: {
                group: { id: groupId as any },
                startTime: MoreThan(new Date()),
            },
            order: { startTime: 'ASC' },
            relations: ['group', 'group.course'],
        });
    }

    /**
     * ASSIGNED statusdagi, boshlanish vaqti kelgan darslar (ASSIGNED → ONGOING)
     */
    async findDueToStart(): Promise<Lecture[]> {
        return await this.lectureRepository.find({
            where: {
                status: LectureStatusEnum.ASSIGNED,
                startTime: LessThanOrEqual(new Date()),
            },
            relations: ['group', 'assignedTeacher'],
        });
    }

    /**
     * ONGOING statusdagi, tugash vaqti kelgan darslar (ONGOING → COMPLETED)
     */
    async findDueToEnd(): Promise<Lecture[]> {
        return await this.lectureRepository.find({
            where: {
                status: LectureStatusEnum.ONGOING,
                endTime: LessThanOrEqual(new Date()),
            },
            relations: ['group', 'group.users', 'assignedTeacher'],
        });
    }

    /**
     * Eslatma yuborilmagan, boshlanishiga minutesBefore daqiqa qolgan darslar
     */
    async findLecturesNeedingReminder(minutesBefore: number): Promise<Lecture[]> {
        const now = new Date();
        const targetTime = new Date(now.getTime() + minutesBefore * 60 * 1000);

        return await this.lectureRepository.find({
            where: {
                status: LectureStatusEnum.ASSIGNED,
                reminderSent: false,
                startTime: LessThanOrEqual(targetTime),
            },
            relations: ['group', 'group.users', 'assignedTeacher'],
        });
    }

    /**
     * O'qituvchining yakunlangan darslari
     */
    async findCompletedByTeacherId(teacherId: ID): Promise<Lecture[]> {
        return await this.lectureRepository.find({
            where: {
                assignedTeacher: { id: teacherId as any },
                status: LectureStatusEnum.COMPLETED,
            },
            order: { startTime: 'DESC' },
            relations: ['group'],
        });
    }

    /**
     * Guruhning barcha darslari (statistika bilan)
     */
    async findAllByGroupIdWithStats(groupId: ID): Promise<Lecture[]> {
        return await this.lectureRepository.find({
            where: { group: { id: groupId as any } },
            order: { order: 'ASC' },
            relations: ['assignedTeacher', 'group'],
        });
    }

    async findLatestByGroupId(groupId: ID): Promise<Lecture | null> {
        return await this.lectureRepository.findOne({
            where: { group: { id: groupId as any } },
            order: { order: 'DESC' },
            relations: ['group'],
        });
    }

}
