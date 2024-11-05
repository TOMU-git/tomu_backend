import { Controller, Post, Body, Res } from "@nestjs/common";
import { PaymeDto } from "src/common/types/type";
import { PaymeMethodEnum } from "src/common/enums/payme-enum";
import { ITransactionService } from "./interfaces/transaction-service";
import { Response } from "express";
import { TransactionsService } from "./transactions.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Payme-Transactions')
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post("payme")
  async payme(@Body() paymeDto: PaymeDto, @Res() res: Response) {
    try {
      if (paymeDto.method === PaymeMethodEnum.CHECK_PERFORM_TRANSACTION) {
        // await this.transactionsService.checkPerformTransaction()
        return res.json({ result: { allow: true } });
      } else if (paymeDto.method === PaymeMethodEnum.CHECK_TRANSACTION) {
      } else if (paymeDto.method === PaymeMethodEnum.CREATE_TRANSACTION) {
      } else if (paymeDto.method === PaymeMethodEnum.PERFORM_TRANSACTION) {
      } else if (paymeDto.method === PaymeMethodEnum.CANCEL_TRANSACTION) {
      } else if (paymeDto.method === PaymeMethodEnum.GET_STATEMENT) {
      }
    } catch (err) {
      console.log("Error :", err);
    }
  }
}
