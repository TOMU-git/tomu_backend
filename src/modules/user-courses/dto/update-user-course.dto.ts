import { PartialType } from "@nestjs/swagger";
import { CreateUserCourseDto } from "./create-user-course.dto";
import { IsBoolean, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateUserCourseDto extends PartialType(CreateUserCourseDto) {
    @ApiProperty({
        description: "The active status of the user course subscription",
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiProperty({
        description: "Whether user has ever paid for this course",
        example: true,
        required: false,
    })
    @IsOptional()
    @IsBoolean()
    hasEverPaid?: boolean;

    @ApiProperty({
        description: "The end date of the subscription",
        example: "2024-12-31",
        required: false,
    })
    @IsOptional()
    endedAt?: Date;
}
