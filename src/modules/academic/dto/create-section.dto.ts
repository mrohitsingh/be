import { IsInt, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateSectionDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  class_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  capacity?: number;
}
