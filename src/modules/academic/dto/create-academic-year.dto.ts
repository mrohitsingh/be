import { IsBoolean, IsDateString, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsDateString()
  @IsNotEmpty()
  start_date!: string;

  @IsDateString()
  @IsNotEmpty()
  end_date!: string;

  @IsBoolean()
  @IsOptional()
  is_current?: boolean;
}
