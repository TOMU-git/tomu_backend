type messageLang = "uz" | "ru" | "en";
type errors =
  | "InvalidAmount"
  | "UserNotFound"
  | "OrderNotFound"
  | "CantDoOperation"
  | "TransactionNotFound"
  | "AlreadyDone"
  | "Pending"
  | "InvalidAuthorization"
  | "BadRequest";

export interface IPaymeErrorData {
  name: string;
  code: number;
  message: Record<messageLang, string>;
}

export const PaymeError: Record<errors, IPaymeErrorData> = {
  InvalidAmount: {
    name: "InvalidAmount",
    code: -31001,
    message: {
      uz: "Noto'g'ri summa",
      ru: "Недопустимая сумма",
      en: "Invalid amount",
    },
  },
  UserNotFound: {
    name: "UserNotFound",
    code: -31050,
    message: {
      uz: "Biz sizning hisobingizni topolmadik.",
      ru: "Мы не нашли вашу учетную запись",
      en: "We couldn't find your account",
    },
  },
  OrderNotFound: {
    name: "OrderNotFound",
    code: -31050,
    message: {
      uz: "Biz orderni topolmadik.",
      ru: "Мы не смогли найти ордер.",
      en: "We could not find the order.",
    },
  },
  CantDoOperation: {
    name: "CantDoOperation",
    code: -31008,
    message: {
      uz: "Biz operatsiyani bajara olmaymiz",
      ru: "Мы не можем сделать операцию",
      en: "We can't do operation",
    },
  },
  TransactionNotFound: {
    name: "TransactionNotFound",
    code: -31003,
    message: {
      uz: "Tranzaktsiya topilmadi",
      ru: "Транзакция не найдена",
      en: "Transaction not found",
    },
  },
  AlreadyDone: {
    name: "AlreadyDone",
    code: -31060,
    message: {
      uz: "Mahsulot uchun to'lov qilingan",
      ru: "Оплачено за товар",
      en: "Paid for the product",
    },
  },
  Pending: {
    name: "Pending",
    code: -31050,
    message: {
      uz: "Mahsulot uchun to'lov kutilayapti",
      ru: "Ожидается оплата товар",
      en: "Payment for the product is pending",
    },
  },
  InvalidAuthorization: {
    name: "InvalidAuthorization",
    code: -32504,
    message: {
      uz: "Avtorizatsiya yaroqsiz",
      ru: "Авторизация недействительна",
      en: "Authorization invalid",
    },
  },
  BadRequest: {
    name: "BadRequest",
    code: -32700,
    message: {
      uz: "BadRequest",
      ru: "BadRequest",
      en: "BadRequest",
    },
  },
};
