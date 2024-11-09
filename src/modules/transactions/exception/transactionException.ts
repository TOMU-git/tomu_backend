import { HttpException, HttpServer, HttpStatus } from '@nestjs/common';
import { IPaymeErrorData } from 'src/common/error/message';

export class TransactionErrorException<TData> extends HttpException {
	transactionErrorCode: number;
	transactionErrorMessage: Record<string, string>;
	transactionData: TData;
	transactionId: number | string;
    isTransactionError = true;

	constructor(
		transactionError: IPaymeErrorData,
		id: number | string,
		statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
        data?: TData,
	) {
		super(transactionError, statusCode);
		this.transactionErrorCode = transactionError.code;
		this.transactionErrorMessage = transactionError.message;
		this.transactionData = data;
		this.transactionId = id;
	}
}



