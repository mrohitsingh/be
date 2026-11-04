import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MarksEntryItemDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  enrollment_id!: number;

  @IsNumber()
  @IsOptional()
  marks_obtained?: number;

  @IsBoolean()
  @IsOptional()
  is_absent?: boolean;

  @IsBoolean()
  @IsOptional()
  is_exempt?: boolean;
}

export class SubmitMarksDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  schedule_id!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarksEntryItemDto)
  entries!: MarksEntryItemDto[];
}
