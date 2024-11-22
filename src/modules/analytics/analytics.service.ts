import { Inject, Injectable } from "@nestjs/common";
import { ITransactionRepo } from "../transactions/interfaces/transaction-repo";
import { IResponseCourse, IResponseData } from "./interfaces/analytics-service.interface";
import { ResData } from "src/lib/resData";
import { ICourseService } from "../course/interfaces/course.service";

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject("ITransactionRepository")
    private readonly transactionsRepository: ITransactionRepo,
    @Inject("ICourseService") private readonly courseService: ICourseService,
  ) {}
  async findAll(from: number, to: number, year: string): Promise<IResponseData> {
    const foundLiveChatAmount =
      await this.transactionsRepository.getAllByLiveChatId(from, to);
    let liveChatAmount = 0;
    for (let index = 0; index < foundLiveChatAmount.length; index++) {
      const element = foundLiveChatAmount[index];
      liveChatAmount = liveChatAmount + Number(element.amount);
    }
    const foundTariffAmount =
      await this.transactionsRepository.getAllByTariffId(from, to);
    let tariffAmount = 0;
    for (let index = 0; index < foundTariffAmount.length; index++) {
      const element = foundTariffAmount[index];
      tariffAmount = tariffAmount + Number(element.amount);
    }

    const totalPrice = liveChatAmount + tariffAmount;

    return {
      course_total: tariffAmount,
      livechat_total: liveChatAmount,
      total_profit: totalPrice,
    };
  }

  async findOne(from: number, to: number, courseId: number): Promise<IResponseCourse> {
    const { data: foundCourse } = await this.courseService.findOneById(courseId);
    const foundProfitCount = await this.transactionsRepository.getAllByCourseId(from, to, courseId);
    let foundCoursePrfit = 0
  for (let index = 0; index < foundProfitCount.data.length; index++) {
      const element = foundProfitCount.data[index];
      foundCoursePrfit = foundCoursePrfit + Number(element.amount);
    }

    return { courseName: foundCourse.title, totalCount: foundProfitCount.count, totalProfit: foundCoursePrfit };
  }
}
