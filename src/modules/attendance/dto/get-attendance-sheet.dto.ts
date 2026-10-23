import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetAttendanceSheetDto {
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @IsNotEmpty()
  section_id!: number;

  @IsInt()
  @IsPositive()
  @Type(() => Number)
  @IsNotEmpty()
  academic_year_id!: number;

  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsOptional()
  session_type?: string;
}

export class UpdateSessionLockDto {
  @IsBoolean()
  @IsNotEmpty()
  is_locked!: boolean;
}
