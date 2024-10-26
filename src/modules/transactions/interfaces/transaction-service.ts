import { PaymeParams } from "src/common/types/type";
import {
  ICancelTransactionDto,
  ICheckTransactionDto,
  ICreateTransactionDto,
  IGetStatementTransactionDto,
  IPerformTransactionDto,
} from "../dto/response.dto";

export interface ITransactionService {
  checkPerformTransaction(params: PaymeParams, id: number): Promise<void>;
  checkTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICheckTransactionDto>;
  createTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICreateTransactionDto>;
  performTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<IPerformTransactionDto>;
  cancelTransaction(
    params: PaymeParams,
    id: number,
  ): Promise<ICancelTransactionDto>;

  getStatement(
    params: PaymeParams,
    id: number,
  ): Promise<Array<IGetStatementTransactionDto>>;
}
