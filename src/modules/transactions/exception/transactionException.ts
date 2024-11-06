import { HttpException } from '@nestjs/common';
import { IPaymeErrorData } from 'src/common/error/message';

export class TransactionError<TData> extends HttpException {
	transactionErrorCode: number;
	transactionErrorMessage: Record<string, string>;
	transactionData: TData;
	transactionId: number | string;
    isTransactionError = true;

	constructor(
		transactionError: IPaymeErrorData,
		id: number | string,
        data?: TData,
	) {
		super(transactionError.name, transactionError.code);
		this.transactionErrorCode = transactionError.code;
		this.transactionErrorMessage = transactionError.message;
		this.transactionData = data;
		this.transactionId = id;
	}
}



