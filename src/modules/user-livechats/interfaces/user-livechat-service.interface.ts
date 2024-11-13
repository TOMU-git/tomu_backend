import { ResData } from "src/lib/resData";
import { CreateUserLivechatDto } from "../dto/create-user-livechat.dto";
import { UserLivechatEntity } from "../entities/user-livechat.entity";

export interface IUserLiveChatService {
    createUserLiveChat(dto: CreateUserLivechatDto): Promise<ResData<UserLivechatEntity>>;
    getAllUserLiveChats(): Promise<ResData<UserLivechatEntity[]>>;
    getUserLiveChatsByUserId(userId: number): Promise<ResData<UserLivechatEntity[]>>;
    getUserLiveChatsByTeacherId(teacherId: number): Promise<ResData<UserLivechatEntity[]>>;
}