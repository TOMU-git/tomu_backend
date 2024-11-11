import * as Joi from 'joi';
import { PaymeAccount } from 'src/common/types/type';

const paymeAccountSchema = Joi.object<PaymeAccount, true>({
	user_id: Joi.string().required(),
	order_id: Joi.string().required(),
});

export const paymeCheckPerformTrSchema = Joi.object({
	amount: Joi.number().integer().required(),
	account: paymeAccountSchema,
});

export const paymeCheckTrSchema = Joi.object({
	id: Joi.string().required(),
});

export const paymePerformTrSchema = Joi.object({
	id: Joi.string().required(),
});

export const paymeCreateTrSchema = Joi.object({
	id: Joi.string().required(),
	time: Joi.number().integer().required(),
	amount: Joi.number().integer().required(),
	account: paymeAccountSchema,
});

export const paymeCancelTrSchema = Joi.object({
	id: Joi.string().required(),
	reason: Joi.number().integer().required(),
});

export const paymeGetStatementTrSchema = Joi.object({
	from: Joi.number().required(),
	to: Joi.number().required(),
});