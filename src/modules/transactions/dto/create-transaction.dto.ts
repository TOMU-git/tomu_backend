import {
  IsInt,
  IsString,
  IsObject,
  ValidateNested,
  IsDefined,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

class PaymeAccount {
  @IsNotEmpty()
  @IsString()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  meta_id: string;
}

export class PaymeCheckPerformTrDto {
  @IsNotEmpty()
  @IsInt()
  amount: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => PaymeAccount)
  account: PaymeAccount;
}

export class PaymeCheckTrDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class PaymePerformTrDto {
  @IsNotEmpty()
  @IsString()
  id: string;
}

export class PaymeCreateTrDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsInt()
  time: number;

  @IsNotEmpty()
  @IsInt()
  amount: number;

  @IsDefined()
  @ValidateNested()
  @Type(() => PaymeAccount)
  account: PaymeAccount;
}

export class PaymeCancelTrDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsInt()
  reason: number;
}

export class PaymeGetStatementTrDto {
  @IsNotEmpty()
  @IsInt()
  from: number;

  @IsNotEmpty()
  @IsInt()
  to: number;
}

// const paymeAccountSchema = Joi.object<PaymeAccount, true>({
// 	user_id: Joi.string().required(),
// 	meta_id: Joi.string().required(),
// });

// export const paymeCheckPerformTrSchema = Joi.object({
// 	amount: Joi.number().integer().required(),
// 	account: paymeAccountSchema,
// });

// export const paymeCheckTrSchema = Joi.object({
// 	id: Joi.string().required(),
// });

// export const paymePerformTrSchema = Joi.object({
// 	id: Joi.string().required(),
// });

// export const paymeCreateTrSchema = Joi.object({
// 	id: Joi.string().required(),
// 	time: Joi.number().integer().required(),
// 	amount: Joi.number().integer().required(),
// 	account: paymeAccountSchema,
// });

// export const paymeCancelTrSchema = Joi.object({
// 	id: Joi.string().required(),
// 	reason: Joi.number().integer().required(),
// });

// export const paymeGetStatementTrSchema = Joi.object({
// 	from: Joi.number().required(),
// 	to: Joi.number().required(),
// });
