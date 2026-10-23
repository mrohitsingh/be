import {
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateGradeScaleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  min_percentage!: number;

  @IsNumber()
  @IsNotEmpty()
  max_percentage!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  letter_grade!: string;

  @IsNumber()
  @IsNotEmpty()
  grade_point!: number;
}
