import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class FinalizeAdmissionDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  academic_year_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  section_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  admission_number!: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  roll_number?: number;
}
