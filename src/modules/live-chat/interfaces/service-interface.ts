import { ResData } from "src/lib/resData";
import { LiveChatEntity } from "../entities/live-chat.entity";
import { CreateLiveChatDto } from "../dto/create-live-chat.dto";
import { UpdateLiveChatDto } from "../dto/update-live-chat.dto";

export interface ILiveChatService {
    create(dto: CreateLiveChatDto): Promise<ResData<LiveChatEntity>>;
    findAll(): Promise<ResData<LiveChatEntity[]>>;
    findOne(id: number): Promise<ResData<LiveChatEntity>>;
    findTeacherLivechats(teacherId: number): Promise<ResData<LiveChatEntity[]>>;
    update(id: number, selectedDay: Date,  dto: UpdateLiveChatDto): Promise<ResData<LiveChatEntity>>;
    remove(id: number): Promise<ResData<LiveChatEntity>>;
    getTimesByDay(day: Date, courseId: number): Promise<ResData<string[]>>;
}

export interface IAvailableTimes {
    times: [];
}