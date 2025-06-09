import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { ID } from "src/common/types/type";

export class UpdateHomeworkProgressDto {
  @ApiProperty({
    type: String,
    example: "60d21b4667d0d8992e610c85",
    description: "Homework progress ID",
  })
  @IsString()
  id: ID;
}
