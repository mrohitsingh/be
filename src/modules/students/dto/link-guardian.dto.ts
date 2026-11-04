import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class LinkGuardianDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  guardian_id!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  relationship_type!: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
