import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional } from "class-validator";

export class UpdateHomeworkProgressDto {
  @ApiProperty({
    description:
      "Indicates if the homework is watched (true - watched, false - not watched)",
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isWatched?: boolean;

  @ApiProperty({
    description: "The count of how many times the homework has been watched",
    example: 3,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  countWatched?: number;
}
