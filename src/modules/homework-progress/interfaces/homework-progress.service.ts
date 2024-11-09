import { ResData } from "../../../lib/resData";
import { ID } from "../../../common/types/type";
import { HomeworkProgress } from "../entities/homework-progress.entity";
import { CreateHomeworkProgressDto } from "../dto/create-homework-progress.dto";
import { UpdateHomeworkProgressDto } from "../dto/update-homework-progress.dto"; // Update DTO importi

// HomeworkProgress xizmatlari uchun interfeys
export interface IHomeworkProgressService {
  // Yangi HomeworkProgress yozuvini yaratadi
  create(
    dto: CreateHomeworkProgressDto,
  ): Promise<ResData<Partial<HomeworkProgress>>>;

  // Barcha HomeworkProgress yozuvlarini qaytaradi
  findAll(): Promise<ResData<Array<HomeworkProgress>>>;

  // ID bo'yicha HomeworkProgress yozuvini topadi
  findOneById(id: ID): Promise<ResData<HomeworkProgress>>;

  // Foydalanuvchi ID bo'yicha barcha HomeworkProgress yozuvlarini qaytaradi
  findByUserId(id: ID): Promise<ResData<Array<HomeworkProgress>>>;

  // ID va DTO bo'yicha HomeworkProgress yozuvini yangilaydi
  update(
    id: ID,
    dto: UpdateHomeworkProgressDto,
  ): Promise<ResData<HomeworkProgress>>;

  // ID bo'yicha HomeworkProgress yozuvini o'chiradi
  delete(id: ID): Promise<ResData<HomeworkProgress>>;

  // Foydalanuvchi ID, block ID va blockOrder bo'yicha HomeworkProgress yozuvlarini qaytaradi
  getVideos(
    userID: ID,
    blockId: ID,
    blockOrder: ID,
  ): Promise<ResData<Array<HomeworkProgress>>>;
}
