import { Inject, Injectable } from "@nestjs/common";
import { ITransactionRepo } from "../transactions/interfaces/transaction-repo";
import {
  IResponseCourse,
  IResponseData,
} from "./interfaces/analytics-service.interface";
import { ICourseService } from "../course/interfaces/course.service";

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject("ITransactionRepository")
    private readonly transactionsRepository: ITransactionRepo,
    @Inject("ICourseService") private readonly courseService: ICourseService,
  ) {}
  async findAll(
    from: number,
    to: number,
    year: number,
  ): Promise<IResponseData> {
    const foundAllTransactions =
      await this.transactionsRepository.findAll(year);

    const filteredTransactions = foundAllTransactions.filter((transaction) => {
      const transactionYear = new Date(
        Number(transaction.createTime),
      ).getUTCFullYear();
      return transactionYear === year;
    });

    const monthlyProfit = {
      January: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      February: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      March: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      April: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      May: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      June: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      July: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      August: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      September: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      October: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      November: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
      December: { totalProfit: 0, liveChatProfit: 0, tariffProfit: 0 },
    };

    for (const transaction of filteredTransactions) {
      const transactionMonth = new Date(
        Number(transaction.createTime),
      ).getMonth();
      const monthName = Object.keys(monthlyProfit)[transactionMonth];

      monthlyProfit[monthName].totalProfit += Number(transaction.amount);

      if (transaction.liveChatId) {
        monthlyProfit[monthName].liveChatProfit += Number(transaction.amount);
      }

      if (transaction.tariffId) {
        monthlyProfit[monthName].tariffProfit += Number(transaction.amount);
      }
    }

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
      data: monthlyProfit,
      totalLiveChatAmount: liveChatAmount,
      totalTariffAmount: tariffAmount,
      totalProfit: totalPrice,
    };
  }

  async findOne(
    from: number,
    to: number,
    courseId: number,
  ): Promise<IResponseCourse> {
    const { data: foundCourse } =
      await this.courseService.findOneById(courseId);
    const foundProfitCount = await this.transactionsRepository.getAllByCourseId(
      from,
      to,
      courseId,
    );
    let foundCoursePrfit = 0;
    for (let index = 0; index < foundProfitCount.data.length; index++) {
      const element = foundProfitCount.data[index];
      foundCoursePrfit = foundCoursePrfit + Number(element.amount);
    }

    return {
      courseName: foundCourse.title,
      totalCount: foundProfitCount.count,
      totalProfit: foundCoursePrfit,
    };
  }
}
