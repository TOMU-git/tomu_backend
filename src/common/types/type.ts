import { PaymeMethodEnum } from "../enums/payme-method-enum";

export type ID = number;

export type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
  request: any;
};

export type PaymeAccount = {
  user_id: string;
  order_id: string;
};

export type PaymeParams = {
  id: string;
  account: PaymeAccount;
  amount: number;
  time: number;
  reason: number;
  from: number;
  to: number;
};

export type PaymeDto = {
  method: PaymeMethodEnum;
  params: PaymeParams;
  id: number;
};
