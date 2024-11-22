import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsInt, IsNotEmpty, IsOptional } from "class-validator";
import { PaymentTypeEnum } from "src/common/enums/enum";

export class CreateOrderDto {
    @ApiProperty({
        type: Number,
        description: "User id"
    })
    @IsInt()
    @IsNotEmpty()
    userId: number;

    @ApiProperty({
        type: Number,
        description: "Course id"
    })
    @IsInt()
    @IsNotEmpty()
    courseId: number;

    @ApiProperty({
        type: String,
        enum: PaymentTypeEnum,
        description: "to'lov haqida ya'ni livechat yoki tariff uchun"
    })
    @IsEnum(PaymentTypeEnum)
    @IsNotEmpty()
    paymentType: PaymentTypeEnum;

    @ApiProperty({
        type: Number,
        description: "Tariff IDsi"
    })
    @IsOptional()
    @IsInt()
    tariffId?: number;

    @ApiProperty({
        type: Number,
        description: "Live Chat IDsi"
    })
    @IsOptional()
    @IsInt()
    liveChatId?: number;
}
