import { ObjectSchema } from "joi";
import { TransactionErrorException } from "../exception/transactionException";
import { PaymeError } from "src/common/error/message";
import { PaymeDataEnum } from "src/common/enums/enum";
export function checkTransactionDto<DTO>(
	schema: ObjectSchema<DTO>,
	dto: DTO,
	id: number,
): void {
	const result = schema.validate(dto);
	if (result.error) {
		throw new TransactionErrorException<PaymeDataEnum>(
			{
				...PaymeError.BadRequest,
				message: {
					uz: result.error.message,
					ru: result.error.message,
					en: result.error.message,
				},
			},
			id,
		);
	}
}
