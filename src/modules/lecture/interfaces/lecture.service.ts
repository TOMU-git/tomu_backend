import { ResData } from "src/lib/resData";
import { ID } from "src/common/types/type";
import { CreateLectureDto } from "../dto/create-lecture.dto";
import { UpdateLectureDto } from "../dto/update-lecture.dto";
import { Lecture } from "../entities/lecture.entity";

export interface ILectureService {
    create(dto: CreateLectureDto): Promise<ResData<Lecture>>;
    findAll(): Promise<ResData<Array<Lecture>>>;
    findOne(id: ID): Promise<ResData<Lecture>>;
    update(id: ID, dto: UpdateLectureDto): Promise<ResData<Lecture>>;
    remove(id: ID): Promise<ResData<Lecture>>;
    createLecturesForGroup(groupId: ID): Promise<ResData<Lecture[]>>;
    updateInviteLink(lectureId: ID, inviteLink: string): Promise<ResData<Lecture>>;
    scheduleNextLecture(groupId: ID): Promise<void>;
    findByGroupId(groupId: ID): Promise<ResData<Lecture[]>>;
    getLectureByUserId(userId: ID): Promise<ResData<Lecture[]>>;
    startLecture(id: ID): Promise<ResData<Lecture>>;
    completeLecture(id: ID): Promise<ResData<Lecture>>;
    cancelLecture(id: ID): Promise<ResData<Lecture>>;
    getTeacherReport(teacherId: ID): Promise<ResData<Lecture[]>>;
    getGroupReport(groupId: ID): Promise<ResData<Lecture[]>>;
}
