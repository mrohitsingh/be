import {
  IsDateString,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  application_number!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name!: string;

  @IsDateString()
  @IsNotEmpty()
  date_of_birth!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  gender!: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  applied_class_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  parent_name!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  parent_email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  parent_phone?: string;
}
