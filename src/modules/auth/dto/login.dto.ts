import { IsEmail, IsNotEmpty, IsOptional, IsPositive, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsPositive()
  @IsOptional()
  tenant_id?: number;
}
