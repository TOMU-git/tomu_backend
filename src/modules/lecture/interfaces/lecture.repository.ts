import { ID } from "src/common/types/type";
import { Lecture } from "../entities/lecture.entity";

export interface ILectureRepository {
  create(dto: Lecture): Promise<Lecture>;
  createBulk(lectures: Lecture[]): Promise<Lecture[]>;
  findAll(): Promise<Array<Lecture>>;
  update(entity: Lecture): Promise<Lecture>;
  delete(entity: Lecture): Promise<Lecture>;
  findById(id: ID): Promise<Lecture | null>;
  findByGroupId(groupId: ID): Promise<Lecture[]>;
  findUpcomingByGroupId(groupId: ID): Promise<Lecture | null>;
  findDueToStart(): Promise<Lecture[]>;
  findDueToEnd(): Promise<Lecture[]>;
  findLatestByGroupId(groupId: ID): Promise<Lecture | null>;
  findLecturesNeedingReminder(minutesBefore: number): Promise<Lecture[]>;
  findCompletedByTeacherId(teacherId: ID): Promise<Lecture[]>;
  findAllByGroupIdWithStats(groupId: ID): Promise<Lecture[]>;
}