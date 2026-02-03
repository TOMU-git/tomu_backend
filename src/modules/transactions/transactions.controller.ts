import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Inject,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { PaymeDto } from "src/common/types/type";
import { PaymeMethodEnum } from "src/common/enums/payme-method-enum";
import { ITransactionService } from "./interfaces/transaction-service";
import { Request, Response } from "express";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { checkTransactionDto } from "./schema/cheackDto";
import {
  paymeCancelTrSchema,
  paymeCheckPerformTrSchema,
  paymeCheckTrSchema,
  paymeCreateTrSchema,
  paymeGetStatementTrSchema,
  paymePerformTrSchema,
} from "./schema/trans-joi-schema";
import { PaymeDataEnum } from "src/common/enums/enum";

@ApiTags("Payme-Transactions")
@Controller("transactions")
export class TransactionsController {
  constructor(
    @Inject("ITransactionServcie")
    private readonly transactionsService: ITransactionService,
  ) { }

  @Post("payme")
  async payme(@Res() res: Response, @Req() req: Request) {
    const { method, params, id }: PaymeDto = req.body;

    // Log qo'shish - mobile vs web farqini ko'rish uchun
    if (method === PaymeMethodEnum.CHECK_PERFORM_TRANSACTION) {
      // console.log("=== PAYME REQUEST DEBUG ===");
      // console.log("Method:", method);
      // console.log("User-Agent:", req.headers['user-agent']);
      // console.log("Headers:", {
      //   'user-agent': req.headers['user-agent'],
      //   'x-forwarded-for': req.headers['x-forwarded-for'],
      //   'origin': req.headers['origin'],
      //   'referer': req.headers['referer'],
      // });
      // console.log("Request body:", JSON.stringify(req.body, null, 2));
      // console.log("Params:", JSON.stringify(params, null, 2));
      // console.log("===========================");
    }

    if (method === PaymeMethodEnum.CHECK_PERFORM_TRANSACTION) {
      checkTransactionDto(paymeCheckPerformTrSchema, params, id);
      await this.transactionsService.checkPerformTransaction(params, id);
      return res.status(HttpStatus.OK).json({ result: { allow: true } });
    } else if (method === PaymeMethodEnum.CHECK_TRANSACTION) {
      checkTransactionDto(paymeCheckTrSchema, params, id);
      const result = await this.transactionsService.checkTransaction(
        params,
        id,
      );
      return res.status(HttpStatus.OK).json({ result, id });
    } else if (method === PaymeMethodEnum.CREATE_TRANSACTION) {
      checkTransactionDto(paymeCreateTrSchema, params, id);
      const result = await this.transactionsService.createTransaction(
        params,
        id,
      );
      return res.status(HttpStatus.OK).json({ result, id });
    } else if (method === PaymeMethodEnum.PERFORM_TRANSACTION) {
      checkTransactionDto(paymePerformTrSchema, params, id);
      const result = await this.transactionsService.performTransaction(
        params,
        id,
      );
      return res.status(HttpStatus.OK).json({ result, id });
    } else if (method === PaymeMethodEnum.CANCEL_TRANSACTION) {
      checkTransactionDto(paymeCancelTrSchema, params, id);
      const result = await this.transactionsService.cancelTransaction(
        params,
        id,
      );
      return res.status(HttpStatus.OK).json({ result, id });
    } else if (method === PaymeMethodEnum.GET_STATEMENT) {
      checkTransactionDto(paymeGetStatementTrSchema, params, id);
      const result = await this.transactionsService.getStatement(params, id);
      return res
        .status(HttpStatus.OK)
        .json({ result: { transaction: result } });
    }
  }
}
