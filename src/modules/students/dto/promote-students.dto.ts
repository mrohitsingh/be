import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentPromotionItemDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  student_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  target_class_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  target_section_id!: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  roll_number?: number;

  @IsBoolean()
  @IsOptional()
  is_retained?: boolean;
}

export class PromoteStudentsDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  source_academic_year_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  target_academic_year_id!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentPromotionItemDto)
  promotions!: StudentPromotionItemDto[];
}
