import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class CreateExamScheduleDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  exam_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  class_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  subject_id!: number;

  @IsDateString()
  @IsNotEmpty()
  exam_date!: string;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  max_marks!: number;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  pass_marks!: number;
}
