import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class CompileReportCardsDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  exam_id!: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  class_id!: number;
}
