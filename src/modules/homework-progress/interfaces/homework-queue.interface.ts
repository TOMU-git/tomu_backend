import { ID } from "src/common/types/type";

// HomeworkQueue service uchun interfeys
export interface IHomeworkQueue {
  id: ID;
  _id?: ID; // MongoDBda ishlatilishi mumkin bo'lgan ID
  userId: ID;
  homeworkId: ID;
  moduleId: ID;
  lessonId: ID;
  priority: number;
  isScheduled: boolean;
  scheduledAt: Date | null;
}
