import { TransactionStateEnum } from "src/common/enums/transaction";

export interface ICheckTransactionDto {
  create_time: number;
  perform_time: number;
  cancel_time: number;
  transaction: string;
  state: TransactionStateEnum;
  reason: number | null;
}

export interface ICreateTransactionDto {
  create_time: number;
  transaction: string;
  state: TransactionStateEnum;
}

export interface IPerformTransactionDto {
  perform_time: number;
  transaction: string;
  state: TransactionStateEnum;
}

export interface ICancelTransactionDto {
  cancel_time: number;
  transaction: string;
  state: TransactionStateEnum;
}
export interface IGetStatementTransactionDto {
  id: string;
  time: number;
  amount: number;
  account: {
    user_id: number;
    order_id: number;
  };
  create_time: number;
  perform_time: number;
  cancel_time: number;
  transaction: number;
  state: number;
  reason: null | number;
  receivers: [];
}
