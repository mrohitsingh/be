import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttendanceEntryDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  enrollment_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  status!: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  remarks?: string;
}

export class SubmitAttendanceDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  section_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  academic_year_id!: number;

  @IsDateString()
  @IsNotEmpty()
  attendance_date!: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  session_type?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];
}
