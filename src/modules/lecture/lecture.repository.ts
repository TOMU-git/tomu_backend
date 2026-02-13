import { Injectable, NotFoundException } from "@nestjs/common";
import { ILectureRepository } from "./interfaces/lecture.repository";
import { ID } from "src/common/types/type";
import { Lecture } from "./entities/lecture.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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
            relations: ['group', 'group.users'],
        });
    }

    async findByGroupId(groupId: ID): Promise<Lecture[]> {
        return await this.lectureRepository.find({
            where: { group: { id: groupId } },
            order: { order: 'ASC' },
            relations: ['user', 'group'],
        });
    }

}
