import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString } from "class-validator";

export class CreateUserLivechatDto {
    @ApiProperty({
        type: Number,
        description: "live chat id"
    })
    @IsInt()
    @IsNotEmpty()
    liveChatId: number;

    @ApiProperty({
        type: Number,
        description: "teacher id"
    })
    @IsInt()
    @IsNotEmpty()
    teacherId: number;

    @ApiProperty({
        type: String,
        description: "meeting url"
    })
    @IsString()
    @IsNotEmpty()
    meetingUrl: string;
}
