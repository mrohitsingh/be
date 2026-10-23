import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  first_name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  last_name?: string;
}
