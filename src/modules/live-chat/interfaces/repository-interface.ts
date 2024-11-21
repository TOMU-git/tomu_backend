import { GenderEnum } from "src/common/enums/enum";
import { LiveChatEntity } from "../entities/live-chat.entity";
import { TimeEnum } from "src/common/enums/time-enum";

export interface ILiveChatRepository {
    createLiveChat(entity: LiveChatEntity): Promise<LiveChatEntity>;
    findAllLiveChats(): Promise<Array<LiveChatEntity>>;
    findLiveChatsByCourseIdAndGender(courseId: number, gender: GenderEnum): Promise<LiveChatEntity[]>;
    findLiveChatById(id: number): Promise<LiveChatEntity | null>;
    findLiveChatByUserId(userId: number): Promise<Array<LiveChatEntity>>;
    findLiveChatByDay(day: Date): Promise<Array<LiveChatEntity>>;
    updateLiveChat(id: number, entity: LiveChatEntity): Promise<LiveChatEntity>;
    deleteLiveChat(entity: LiveChatEntity): Promise<LiveChatEntity>;
    findByTimesByDayAndCourseId(day: Date, courseId: number): Promise<string[]>;
}