import { Injectable } from "@nestjs/common";
import { ILectureRepository } from "./interfaces/lecture.repository";
import { ID } from "src/common/types/type";
import { Lecture } from "./entities/lecture.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class LectureRepository implements ILectureRepository {
    constructor(
        @InjectRepository(Lecture)
        private readonly lectureRepository: Repository<Lecture>,
    ) {}
    create(dto: Lecture): Promise<Lecture> {
        const newLecture     = this.lectureRepository.create(dto);
        return this.lectureRepository.save(newLecture);
    }
    findAll(): Promise<Array<Lecture>> {
        return this.lectureRepository.find();
    }
    update(entity: Lecture): Promise<Lecture> {
        return this.lectureRepository.save(entity);
    }
    delete(entity: Lecture): Promise<Lecture> {
        throw new Error("Method not implemented.");
    }
    findById(id: ID): Promise<Lecture | null> {
        throw new Error("Method not implemented.");
    }
    
}
