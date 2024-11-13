import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import { CreateLiveChatDto } from "./dto/create-live-chat.dto";
import { UpdateLiveChatDto } from "./dto/update-live-chat.dto";
import { ResData } from "src/lib/resData";
import { LiveChatEntity } from "./entities/live-chat.entity";
import { ILiveChatService } from "./interfaces/service-interface";
import { ILiveChatRepository } from "./interfaces/repository-interface";
import { IUserService } from "../user/interfaces/user.service";
import { MeetingStatusEnum } from "src/common/enums/enum";

@Injectable()
export class LiveChatService implements ILiveChatService {
  constructor(
    @Inject("ILiveChatRepository")
    private readonly liveChatRepository: ILiveChatRepository,
    @Inject("IUserService") private readonly userService: IUserService,
  ) {}
  async create(
    selectedDate: Date,
    createLiveChatDto: CreateLiveChatDto,
  ): Promise<ResData<LiveChatEntity>> {
    const { data: foundUser } = await this.userService.findOneById(
      createLiveChatDto.userId,
    );
    const newLiveChat = new LiveChatEntity();
    newLiveChat.firstName = createLiveChatDto.firstName;
    newLiveChat.lastName = createLiveChatDto.lastName;
    newLiveChat.gender = createLiveChatDto.gender;
    newLiveChat.price = createLiveChatDto.duration * 2000;
    newLiveChat.phoneNumber = createLiveChatDto.phoneNumber;
    newLiveChat.duration = createLiveChatDto.duration;
    newLiveChat.userId = foundUser.id;
    newLiveChat.selectedMeetingCourse = createLiveChatDto.selectedMeetingCourse;
    newLiveChat.selectedDay = selectedDate;
    newLiveChat.selectedTime = createLiveChatDto.selectedTime;
    newLiveChat.status = MeetingStatusEnum.UNPAID;
    const createdLiveChat =
      await this.liveChatRepository.createLiveChat(newLiveChat);
    return new ResData<LiveChatEntity>(
      "Live chat created successfully",
      201,
      createdLiveChat,
    );
  }

  async findAll(): Promise<ResData<LiveChatEntity[]>> {
    const liveChats = await this.liveChatRepository.findAllLiveChats();
    return new ResData<LiveChatEntity[]>("All live chat forms", 200, liveChats);
  }

  async findOne(id: number): Promise<ResData<LiveChatEntity>> {
    const foundLiveChat = await this.liveChatRepository.findLiveChatById(id);
    if (!foundLiveChat) {
      throw new HttpException("Live chat not found", HttpStatus.NOT_FOUND);
    }
    return new ResData<LiveChatEntity>("Live chat found", 200, foundLiveChat);
  }

  async update(
    id: number,
    selectedDay: Date,
    updateLiveChatDto: UpdateLiveChatDto,
  ): Promise<ResData<LiveChatEntity>> {
    const { data: foundLiveChat } = await this.findOne(id);
    foundLiveChat.firstName = updateLiveChatDto.firstName;
    foundLiveChat.lastName = updateLiveChatDto.lastName;
    foundLiveChat.gender = updateLiveChatDto.gender;
    foundLiveChat.phoneNumber = updateLiveChatDto.phoneNumber;
    foundLiveChat.duration = updateLiveChatDto.duration;
    foundLiveChat.price = updateLiveChatDto.duration * 2000;
    foundLiveChat.selectedMeetingCourse = updateLiveChatDto.selectedMeetingCourse;
    foundLiveChat.selectedDay = selectedDay;
    foundLiveChat.selectedTime = updateLiveChatDto.selectedTime;
    foundLiveChat.status = updateLiveChatDto.status;
    const updatedLiveChat = await this.liveChatRepository.updateLiveChat(foundLiveChat);
    return new ResData<LiveChatEntity>(
      "Live chat updated successfully",
      200,
      updatedLiveChat,
    );
  }

  async remove(id: number): Promise<ResData<LiveChatEntity>> {
    const { data: foundLiveChat } = await this.findOne(id);
    const deletedLiveChat =
      await this.liveChatRepository.deleteLiveChat(foundLiveChat);
    return new ResData<LiveChatEntity>(
      "Live chat deleted successfully",
      200,
      deletedLiveChat,
    );
  }
}
