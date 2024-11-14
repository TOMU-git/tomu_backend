import { Inject, Injectable } from "@nestjs/common";
import { CreateUserLivechatDto } from "./dto/create-user-livechat.dto";
import { IUserLiveChatService } from "./interfaces/user-livechat-service.interface";
import { IUserLiveChatRepository } from "./interfaces/user-livechat.repository.interface";
import { IUserService } from "../user/interfaces/user.service";
import { ResData } from "src/lib/resData";
import { UserLivechatEntity } from "./entities/user-livechat.entity";
import { ILiveChatService } from "../live-chat/interfaces/service-interface";

@Injectable()
export class UserLivechatsService implements IUserLiveChatService {
  constructor(
    @Inject("IUserLiveChatRepository")
    private readonly userLiveChatRepository: IUserLiveChatRepository,
    @Inject("ILiveChatService")
    private readonly liveChatService: ILiveChatService,
    @Inject("IUserService") private readonly userService: IUserService,
  ) {}
  async createUserLiveChat(
    dto: CreateUserLivechatDto,
  ): Promise<ResData<UserLivechatEntity>> {
    const { data: foundLiveChat } = await this.liveChatService.findOne(
      dto.liveChatId,
    );
    await this.userService.findOneById(foundLiveChat.userId);
    await this.userService.findOneById(dto.teacherId);
    const newUserLiveChat = new UserLivechatEntity();
    newUserLiveChat.liveChatId = foundLiveChat.id;
    newUserLiveChat.teacherId = dto.teacherId;
    newUserLiveChat.courseName = foundLiveChat.selectedMeetingCourse;
    newUserLiveChat.isAccepted = true;
    newUserLiveChat.meetingDate = foundLiveChat.selectedDay;
    newUserLiveChat.meetingTime = foundLiveChat.selectedTime;
    newUserLiveChat.meetingUrl = dto.meetingUrl;
    const createdUserLiveChat =
      await this.userLiveChatRepository.create(newUserLiveChat);
    return new ResData<UserLivechatEntity>(
      "User live chat created successfully",
      201,
      createdUserLiveChat,
    );
  }

  async getAllUserLiveChats(): Promise<ResData<UserLivechatEntity[]>> {
    const foundUserLiveChats = await this.userLiveChatRepository.getAll();
    return new ResData<UserLivechatEntity[]>(
      "All accepted live chats",
      200,
      foundUserLiveChats,
    );
  }

  async getUserLiveChatsByUserId(
    userId: number,
  ): Promise<ResData<UserLivechatEntity[]>> {
    await this.userService.findOneById(userId);
    const foundUserLiveChatsByUserId =
      await this.userLiveChatRepository.getByUserId(userId);
    return new ResData<UserLivechatEntity[]>(
      "Accepted user live chats",
      200,
      foundUserLiveChatsByUserId,
    );
  }

  async getUserLiveChatsByTeacherId(
    teacherId: number,
  ): Promise<ResData<UserLivechatEntity[]>> {
    await this.userService.findOneById(teacherId);
    const foundUserLiveChatsByTeacherId =
      await this.userLiveChatRepository.getByTeacherId(teacherId);
    return new ResData<UserLivechatEntity[]>(
      "Accepted teacher live chats",
      200,
      foundUserLiveChatsByTeacherId,
    );
  }
}
