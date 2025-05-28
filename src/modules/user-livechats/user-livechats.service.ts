import { Inject, Injectable } from "@nestjs/common";
import { CreateUserLivechatDto } from "./dto/create-user-livechat.dto";
import { IUserLiveChatService } from "./interfaces/user-livechat-service.interface";
import { IUserLiveChatRepository } from "./interfaces/user-livechat.repository.interface";
import { IUserService } from "../user/interfaces/user.service";
import { ResData } from "src/lib/resData";
import { UserLivechatEntity } from "./entities/user-livechat.entity";
import { ILiveChatService } from "../live-chat/interfaces/service-interface";
import { ICourseService } from "../course/interfaces/course.service";
import { ILiveChatRepository } from "../live-chat/interfaces/repository-interface";

@Injectable()
export class UserLivechatsService implements IUserLiveChatService {
  constructor(
    @Inject("IUserLiveChatRepository")
    private readonly userLiveChatRepository: IUserLiveChatRepository,
    @Inject("ILiveChatService")
    private readonly liveChatService: ILiveChatService,
    @Inject("IUserService") private readonly userService: IUserService,
    @Inject("ILiveChatRepository") private readonly liveChatRepository: ILiveChatRepository,
    @Inject("ICourseService") private readonly courseService: ICourseService,
  ) {}
  async createUserLiveChat(
    dto: CreateUserLivechatDto,
  ): Promise<ResData<UserLivechatEntity>> {
    const { data: foundLiveChat } = await this.liveChatService.findOne(
      dto.liveChatId,
    );
    await this.userService.findOneById(foundLiveChat.userId);
    await this.userService.findOneById(dto.teacherId);
    const { data: foundCourse } = await this.courseService.findOneById(
      Number(foundLiveChat.selectedCourseId),
    );
    const newUserLiveChat = new UserLivechatEntity();
    newUserLiveChat.liveChatId = foundLiveChat.id;
    newUserLiveChat.teacherId = dto.teacherId;
    newUserLiveChat.userId = foundLiveChat.userId;
    newUserLiveChat.courseId = foundLiveChat.selectedCourseId;
    newUserLiveChat.isAccepted = true;
    newUserLiveChat.selectedDay = foundLiveChat.selectedDay;
    newUserLiveChat.selectedTime = foundLiveChat.selectedTime;
    newUserLiveChat.meetingUrl = dto.meetingUrl;
    newUserLiveChat.phoneNumber = foundLiveChat.phoneNumber;
    newUserLiveChat.firstName = foundLiveChat.firstName;
    newUserLiveChat.lastName = foundLiveChat.lastName;
    newUserLiveChat.duration = foundLiveChat.duration;
    newUserLiveChat.gender = foundLiveChat.gender;
    newUserLiveChat.selectedCourseName = foundCourse.title;
    newUserLiveChat.price = foundLiveChat.price;
    const createdUserLiveChat =
      await this.userLiveChatRepository.create(newUserLiveChat);
    foundLiveChat.isAccepted = true;
    await this.liveChatRepository.updateLiveChat(foundLiveChat.id, foundLiveChat);
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
    const arr = [];
    for (let index = 0; index < foundUserLiveChatsByUserId.length; index++) {
      const e = foundUserLiveChatsByUserId[index];
      const rightTime = new Date();
      const formattedDate = new Date(rightTime).toISOString().split('T')[0];
      if (String(e.selectedDay) > formattedDate) {
        arr.push(e);
      }
    }
    return new ResData<UserLivechatEntity[]>(
      "Accepted user live chats",
      200,
      arr,
    );
  }

  async getUserLiveChatsByTeacherId(
    teacherId: number,
  ): Promise<ResData<UserLivechatEntity[]>> {
    const { data: foundTeacher } =
      await this.userService.findOneById(teacherId);
    const foundUserLiveChatsByTeacherId =
      await this.userLiveChatRepository.getByTeacherId(
        teacherId,
        foundTeacher.courseId,
      );
    return new ResData<UserLivechatEntity[]>(
      "Accepted teacher live chats",
      200,
      foundUserLiveChatsByTeacherId,
    );
  }
}
