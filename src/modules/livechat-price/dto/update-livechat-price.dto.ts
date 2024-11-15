import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class UpdateLivechatPriceDto  {
    @ApiProperty({
        type: Number,
        description: 'The new price for the livechat',
    })
    @IsNumber()
    @IsNotEmpty()
    price: number;
}
