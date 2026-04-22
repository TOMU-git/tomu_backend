import { Inject, Injectable } from "@nestjs/common";
import { PaymeParams } from "src/common/types/type";
import { ITransactionRepo } from "./interfaces/transaction-repo";
import { ITransactionService } from "./interfaces/transaction-service";
import { IUserRepository } from "../user/interfaces/user.repository";
import { ITariffRepository } from "../tariff/interface/tariff.repository";
import { TransactionErrorException } from "./exception/transactionException";
import { PaymeError } from "src/common/error/message";
import {
  ICancelTransactionDto,
  ICheckTransactionDto,
  ICreateTransactionDto,
  IGetStatementTransactionDto,
  IPerformTransactionDto,
} from "./dto/response.dto";
import { TransactionStateEnum } from "src/common/enums/transaction";
import { TransactionEntity } from "./entities/transaction.entity";
import { IOrderService } from "../orders/interfaces/service-interface";
import { OrderStatus } from "src/common/enums/order-status";
import { IOrderRepository } from "../orders/interfaces/repository-interface";
import { ILiveChatRepository } from "../live-chat/interfaces/repository-interface";
import { MeetingStatusEnum, StatusEnum } from "src/common/enums/enum";
import { UserTariff } from "../user-tariff/entities/user-tariff.entity";
import { IUserTariffRepository } from "../user-tariff/interfaces/user-tariff.repository";
import { UserCourse } from "../user-courses/entities/user-course.entity";
import { IUserCourseRepository } from "../user-courses/interfaces/user-course.repository";
import { ICourseRepository } from "../course/interfaces/course.repository";
import { ICoursePaymentRepository } from "../course-payment-history/interfaces/course-payment-repository.interface";
import { CoursePaymentHistoryEntity } from "../course-payment-history/entities/course-payment-history.entity";
import { LivechatPaymentHistoryEntity } from "../livechat-payment-history/entities/livechat-payment-history.entity";
import { ILiveChatPaymentRepository } from "../livechat-payment-history/interfaces/livechat-payment-repository.interface";
import { IUserLiveChatRepository } from "../user-livechats/interfaces/user-livechat.repository.interface";
import { LimitCheckService } from "../ai/services/limit-check.service";

@Injectable()
export class TransactionsService implements ITransactionService {
  constructor(
    @Inject("ITransactionRepository")
    private readonly transactionRepository: ITransactionRepo,
    @Inject("IUserRepository") private readonly userRepository: IUserRepository,
    @Inject("IOrderService") private readonly orderService: IOrderService,
    @Inject("IOrderRepository")
    private readonly orderRepository: IOrderRepository,
    @Inject("ILiveChatRepository")
    private readonly liveChatRepository: ILiveChatRepository,
    @Inject("ITariffRepository")
    private readonly tariffRepository: ITariffRepository,
    @Inject("IUserTariffRepository")
    private readonly userTariffRepository: IUserTariffRepository,
    @Inject("IUserCourseRepository")
    private readonly userCourseRepository: IUserCourseRepository,
    @Inject("ICourseRepository")
    private readonly courseRepository: ICourseRepository,
    @Inject("ICoursePaymentRepository")
    private readonly coursePaymentRepository: ICoursePaymentRepository,
    @Inject("ILiveChatPaymentRepository")
    private readonly liveChatPaymentRepository: ILiveChatPaymentRepository,
    @Inject("IUserLiveChatRepository")
    private readonly userLiveChatRepository: IUserLiveChatRepository,
    private readonly limitCheckService: LimitCheckService, // AI limit reset uchun
    @Inject("IGroupService")
    private readonly groupService: any,
  ) { }

  async checkPerformTransaction(params: PaymeParams, id: number) {
    const {
      account: { user_id: userId, order_id: orderId },
    } = params;

    const foundUser = await this.userRepository.findOneById(Number(userId));
    if (!foundUser) {
      throw new TransactionErrorException(PaymeError.UserNotFound, id);
    }
    const foundOrder = await this.orderRepository.findOneById(
      Number(orderId),
    );
    if (!foundOrder) {
      throw new TransactionErrorException(PaymeError.OrderNotFound, id);
    }

    let { amount } = params;
    const originalAmount = amount;
    amount = Math.floor(amount / 100);

    if (amount !== Number(foundOrder.totalPrice)) {
      console.error("❌ AMOUNT MISMATCH ERROR:", {
        receivedAmountOriginal: originalAmount,
        receivedAmountAfterDiv: amount,
        orderTotalPrice: foundOrder.totalPrice,
        orderTotalPriceNumber: Number(foundOrder.totalPrice),
        difference: Math.abs(amount - Number(foundOrder.totalPrice)),
      });
      throw new TransactionErrorException(PaymeError.InvalidAmount, id);
    }
  }
  async checkTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICheckTransactionDto> {
    const foundTransaction = await this.transactionRepository.getOneById(
      params.id,
    );

    if (!foundTransaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }

    return {
      create_time: Number(foundTransaction.createTime),
      perform_time: Number(foundTransaction.performTime),
      cancel_time: Number(foundTransaction.cancelTime),
      transaction: foundTransaction.id,
      state: foundTransaction.state,
      reason: foundTransaction.reason,
    };
  }
  async createTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICreateTransactionDto> {
    const {
      account: { user_id: userId, order_id: orderId },
      time,
    } = params;
    let { amount } = params;

    amount = Math.floor(amount / 100);

    await this.checkPerformTransaction(params, id);

    const transaction = await this.transactionRepository.getOneById(params.id);

    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(orderId),
    );

    if (transaction) {
      if (transaction.state !== TransactionStateEnum.PENDING) {
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }

      const currentTime = Date.now();

      const expirationTime =
        (currentTime - Number(transaction.createTime)) / 60000 < 12; // 12m
      if (!expirationTime) {
        transaction.state = TransactionStateEnum.PENDING_CANCELED;
        await this.transactionRepository.updateTransaction(
          transaction.id,
          transaction,
        );

        foundOrder.status = OrderStatus.TIMEOUT;
        await this.orderRepository.update(foundOrder);
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }

      return {
        create_time: Number(transaction.createTime),
        transaction: transaction.id,
        state: TransactionStateEnum.PENDING,
      };
    }
    const transactionPaidOrPending =
      await this.transactionRepository.getByFilter(
        Number(userId),
        Number(orderId),
      );

    if (transactionPaidOrPending) {
      if (transactionPaidOrPending.state === TransactionStateEnum.PAID) {
        throw new TransactionErrorException(PaymeError.AlreadyDone, id);
      }
      if (transactionPaidOrPending.state === TransactionStateEnum.PENDING) {
        throw new TransactionErrorException(PaymeError.Pending, id);
      }
    }

    const newTransaction = new TransactionEntity();
    newTransaction.id = params.id;
    newTransaction.userId = Number(userId);
    newTransaction.orderId = Number(orderId);
    newTransaction.state = TransactionStateEnum.PENDING;
    newTransaction.createTime = time;
    newTransaction.liveChatId = foundOrder.liveChatId
      ? foundOrder.liveChatId
      : null;

    newTransaction.tariffId = foundOrder.tariffId ? foundOrder.tariffId : null;
    newTransaction.courseId = foundOrder.courseId ? foundOrder.courseId : null;
    newTransaction.amount = amount;
    (newTransaction.reason = null), (newTransaction.cancelTime = 0);
    newTransaction.performTime = 0;

    const createdTransaction =
      await this.transactionRepository.createTransaction(newTransaction);

    foundOrder.status = OrderStatus.PENDING;
    await this.orderRepository.update(foundOrder);

    return {
      create_time: Number(createdTransaction.createTime),
      transaction: params.id,
      state: TransactionStateEnum.PENDING,
    };
  }
  async performTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<IPerformTransactionDto> {
    // Joriy vaqtni olish
    const currentTime = Date.now();

    // Transaksiyani ID orqali topish
    const transaction = await this.transactionRepository.getOneById(params.id);
    // Agar transaksiya topilmasa xatolik qaytarish
    if (!transaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }

    // Agar transaksiya allaqachon bajarilgan yoki bekor qilingan bo'lsa
    if (transaction.state !== TransactionStateEnum.PENDING) {
      if (transaction.state !== TransactionStateEnum.PAID) {
        throw new TransactionErrorException(PaymeError.CantDoOperation, id);
      }
      // Agar transaksiya allaqachon to'langan bo'lsa, mavjud ma'lumotlarni qaytarish
      return {
        perform_time: Number(transaction.performTime),
        transaction: transaction.id,
        state: TransactionStateEnum.PAID,
      };
    }

    // Buyurtmani ID orqali topish
    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(transaction.orderId),
    );
    // Transaksiya vaqti tugaganligini tekshirish (12 daqiqa)
    const expirationTime =
      (currentTime - Number(transaction.createTime)) / 60000 < 12;

    // Agar vaqt tugagan bo'lsa
    if (!expirationTime) {
      // Transaksiyani bekor qilish
      transaction.state = TransactionStateEnum.PENDING_CANCELED;
      transaction.reason = 4; // Vaqt tugashi sababli bekor qilish
      transaction.cancelTime = currentTime;
      await this.transactionRepository.updateTransaction(
        transaction.id,
        transaction,
      );

      // Buyurtma holatini yangilash
      foundOrder.status = OrderStatus.TIMEOUT;
      await this.orderRepository.update(foundOrder);
      throw new TransactionErrorException(PaymeError.CantDoOperation, id);
    }

    // Transaksiyani muvaffaqiyatli bajarilgan deb belgilash
    transaction.state = TransactionStateEnum.PAID;
    transaction.performTime = currentTime;
    await this.transactionRepository.updateTransaction(
      transaction.id,
      transaction,
    );

    // Agar buyurtmada live chat bo'lsa
    if (foundOrder.liveChatId) {
      // Live chat ma'lumotlarini olish
      const foundLiveChat = await this.liveChatRepository.findLiveChatById(
        Number(foundOrder.liveChatId),
      );
      // Live chat holatini yangilash
      (foundLiveChat.status = MeetingStatusEnum.PAID),
        await this.liveChatRepository.updateLiveChat(
          foundLiveChat.id,
          foundLiveChat,
        );

      // Live chat uchun to'lov tarixini yaratish
      const newLiveChatPayment = new LivechatPaymentHistoryEntity();
      newLiveChatPayment.fullName = foundLiveChat.firstName + " " + foundLiveChat.lastName;
      newLiveChatPayment.courseName = foundLiveChat.selectedCourseName;
      newLiveChatPayment.paymentAmount = foundLiveChat.price;
      newLiveChatPayment.gender = foundLiveChat.gender;
      newLiveChatPayment.liveChatId = foundLiveChat.id;
      newLiveChatPayment.userPhoneNumber = foundLiveChat.phoneNumber;
      newLiveChatPayment.duration = foundLiveChat.duration;
      newLiveChatPayment.selectedDay = foundLiveChat.selectedDay;
      newLiveChatPayment.selectedTime = foundLiveChat.selectedTime;
      await this.liveChatPaymentRepository.create(newLiveChatPayment);
    }

    // Agar buyurtmada tarif bo'lsa
    if (foundOrder.tariffId) {
      // Kerakli ma'lumotlarni olish
      const foundTariff = await this.tariffRepository.findOneById(
        Number(foundOrder.tariffId),
      );

      const foundUser = await this.userRepository.findOneById(
        Number(foundOrder.userId),
      );
      const foundCourse = await this.courseRepository.findById(
        Number(foundTariff.courseId),
      );

      // Foydalanuvchining kursdagi mavjud obunasini tekshirish
      const foundUserCourse =
        await this.userCourseRepository.findByUserIdAndCourseId(
          Number(foundOrder.userId),
          Number(foundTariff.courseId),
        );

      // Agar foydalanuvchida allaqachon kurs bo'lsa
      if (foundUserCourse) {
        // Mavjud kurs obunasini yangilash
        foundUserCourse.startedAt = new Date();
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + foundTariff.duration);
        foundUserCourse.endedAt = expiryDate;
        foundUserCourse.isActive = true;
        foundUserCourse.tariffId = foundOrder.tariffId;

        // Birinchi marta to'lov qilindi
        foundUserCourse.hasEverPaid = true;
        const updatedUserCourse = await this.userCourseRepository.update(foundUserCourse);

        // Guruhga qo'shish (to'lov qilingan userlar)
        try {
          await this.groupService.addStudentToGroup(Number(foundOrder.userId), Number(foundTariff.courseId));
        } catch (error: any) {
          console.error('[WARNING] Group enrollment error (payment successful):', error.message);
        }
      } else {
        // Yangi kurs obunasini yaratish
        const newUserCourse = new UserCourse();
        newUserCourse.status = StatusEnum.PANDING;
        newUserCourse.isActive = true;
        newUserCourse.startedAt = new Date();
        const now = new Date();
        const expiryDate = new Date(now);
        expiryDate.setDate(expiryDate.getDate() + foundTariff.duration);
        newUserCourse.endedAt = expiryDate;
        newUserCourse.course = foundCourse;
        newUserCourse.user = foundUser;
        newUserCourse.tariffId = foundOrder.tariffId;
        // Birinchi marta to'lov qilindi
        newUserCourse.hasEverPaid = true;
        const createdUserCourse = await this.userCourseRepository.create(newUserCourse);

        // Guruhga qo'shish (to'lov qilingan userlar)
        try {
          await this.groupService.addStudentToGroup(Number(foundOrder.userId), Number(foundTariff.courseId));
        } catch (error: any) {
          console.error('[WARNING] Group enrollment error (payment successful):', error.message);
        }
      }

      // Kurs to'lovi tarixini yaratish
      const newCoursePayment = new CoursePaymentHistoryEntity();
      newCoursePayment.courseId = foundCourse.id;
      newCoursePayment.fullName =
        foundUser.firstName + " " + foundUser.lastName;
      newCoursePayment.gender = foundUser.gender;
      newCoursePayment.paymentAmount = foundOrder.totalPrice;
      newCoursePayment.courseName = foundCourse.title;
      newCoursePayment.userPhoneNumber = foundUser.phoneNumber;
      await this.coursePaymentRepository.create(newCoursePayment);

      // AI limitni yangilash - to'lov qilinganda shu kurs uchun o'sha oydagi barcha cost recordlarni o'chirish
      // Bu user'ga yangi 2$ limit beradi
      try {
        await this.limitCheckService.resetAILimitForCourse(
          Number(foundOrder.userId),
          Number(foundTariff.courseId)
        );
      } catch (error: any) {
        // AI limit reset xatosi to'lovni to'xtatmasligi kerak
        // Faqat log qilamiz, lekin to'lov muvaffaqiyatli deb hisoblanadi
        console.error(
          `⚠️  AI limit reset xatosi (to'lov muvaffaqiyatli):`,
          error.message
        );
      }
    }

    // Buyurtma holatini yangilash
    foundOrder.status = OrderStatus.PAID;
    await this.orderRepository.update(foundOrder);

    // Muvaffaqiyatli javob qaytarish
    return {
      perform_time: currentTime,
      transaction: transaction.id,
      state: TransactionStateEnum.PAID,
    };
  }
  async cancelTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICancelTransactionDto> {
    const transaction = await this.transactionRepository.getOneById(params.id);
    if (!transaction) {
      throw new TransactionErrorException(PaymeError.TransactionNotFound, id);
    }
    const { data: foundOrder } = await this.orderService.getOrderById(
      Number(transaction.orderId),
    );
    const currentTime = Date.now();
    if (transaction.state > 0) {
      transaction.state = -Math.abs(transaction.state);
      transaction.reason = params.reason;
      transaction.cancelTime = currentTime;
      await this.transactionRepository.updateTransaction(
        transaction.id,
        transaction,
      );
      foundOrder.status = OrderStatus.CANCELED;
      await this.orderRepository.update(foundOrder);
    }
    if (foundOrder.liveChatId) {
      const foundLiveChat = await this.liveChatRepository.findLiveChatById(
        Number(foundOrder.liveChatId),
      );
      foundLiveChat.status = MeetingStatusEnum.UNPAID;
      await this.liveChatRepository.updateLiveChat(
        foundLiveChat.id,
        foundLiveChat,
      );
    }

    if (foundOrder.tariffId) {
      const foundUserTariff = await this.userTariffRepository.findOneByTariffId(
        foundOrder.tariffId,
      );
      await this.userTariffRepository.delete(foundUserTariff);
    }
    foundOrder.status = OrderStatus.CANCELED;
    await this.orderRepository.update(foundOrder);
    return {
      cancel_time: Number(transaction.cancelTime) || currentTime,
      transaction: transaction.id,
      state: -Math.abs(transaction.state),
    };
  }
  async getStatement(
    params: PaymeParams,
    id: number,
  ): Promise<Array<IGetStatementTransactionDto>> {
    const transactions: Array<TransactionEntity> =
      await this.transactionRepository.getTransactionInPeriod(
        Number(params.from),
        Number(params.to),
      );
    const mappedData: Array<IGetStatementTransactionDto> = transactions.map(
      (tr: TransactionEntity) => ({
        id: tr.id,
        time: Number(tr.createTime),
        amount: Number(tr.amount) * 100,
        account: { order_id: tr.orderId, user_id: tr.userId },
        create_time: Number(tr.createTime),
        perform_time: Number(tr.createTime),
        cancel_time: Number(tr.createTime),
        transaction: Number(id),
        state: Number(tr.createTime),
        reason: Number(tr.createTime) ? Number(tr.createTime) : null,
        receivers: [],
      }),
    );
    return mappedData;
  }
}
