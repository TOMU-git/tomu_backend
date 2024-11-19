import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { TransactionErrorException } from "src/modules/transactions/exception/transactionException";
import { PaymeError } from "../error/message";
import { decode } from "base-64";
import { config } from "../config";

@Injectable()
export class CheckTokenMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.body;
      const authHeader = req.headers.authorization;

      const token = authHeader && authHeader.split(" ")[1];
      if (!token) {
        throw new TransactionErrorException(PaymeError.InvalidAuthorization, id);
      }
      const data = decode(token);
      if (!data.includes(config.paymeMerchantKey)) {
        throw new TransactionErrorException(PaymeError.InvalidAuthorization, id);
      }
      next();
    } catch (err) {
      next(err);
    }
  }
}
