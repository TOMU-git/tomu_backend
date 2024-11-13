import { UserLivechatEntity } from "../entities/user-livechat.entity";

export interface IUserLiveChatRepository {
    create(entity: UserLivechatEntity): Promise<UserLivechatEntity>;
    getAll(): Promise<UserLivechatEntity[]>;
    getByUserId(userId: number): Promise<UserLivechatEntity[]>;
    getByTeacherId(teacherId: number): Promise<UserLivechatEntity[]>;
}