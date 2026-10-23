import { IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryStudentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  academic_year_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  class_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  section_id?: number;

  @IsOptional()
  @IsString()
  search?: string;
}
