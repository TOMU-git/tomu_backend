import { InjectRepository } from "@nestjs/typeorm";
import { ILiveChatRepository } from "./interfaces/repository-interface";
import { LiveChatEntity } from "./entities/live-chat.entity";
import { Repository } from "typeorm";
import { GenderEnum, MeetingStatusEnum } from "src/common/enums/enum";

export class LiveChatRepository implements ILiveChatRepository {
  constructor(
    @InjectRepository(LiveChatEntity)
    private readonly repository: Repository<LiveChatEntity>,
  ) {}

  async createLiveChat(entity: LiveChatEntity): Promise<LiveChatEntity> {
    return this.repository.save(entity);
  }

  async findAllLiveChats(): Promise<Array<LiveChatEntity>> {
    return this.repository.find({ where: { status: MeetingStatusEnum.PAID } });
  }

  async findLiveChatsByCourseIdAndGender(
    courseId: number,
    genderr: GenderEnum,
  ): Promise<LiveChatEntity[]> {
    return await this.repository.find({
      where: [
        {
          selectedCourseId: courseId,
          gender: genderr,
          isAccepted: false,
          status: MeetingStatusEnum.PAID,
        },
      ],
    });
  }

  async findLiveChatById(id: number): Promise<LiveChatEntity | null> {
    return this.repository.findOneBy({ id });
  }

  async findLiveChatByUserId(userId: number): Promise<Array<LiveChatEntity>> {
    return this.repository.find({ where: { userId } });
  }

  async findByTimesByDayAndCourseId(
    day: Date,
    courseId: number,
  ): Promise<string[]> {
    const allTimes = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];
    const selectedTimes = await this.repository.find({where: { selectedDay: day, selectedCourseId: courseId }});
    const takenTimes = selectedTimes.map((entry) => entry.selectedTime);
    const availableTimes = allTimes.filter((time) => !takenTimes.includes(time));
    return availableTimes;
  }

  async findLiveChatByDay(day: Date): Promise<Array<LiveChatEntity>> {
    return this.repository.find({ where: { selectedDay: day } });
  }

  async updateLiveChat(id: number, entity: LiveChatEntity): Promise<any> {
    return this.repository.update(id, entity);
  }

  async deleteLiveChat(entity: LiveChatEntity): Promise<LiveChatEntity> {
    return this.repository.remove(entity);
  }
}
