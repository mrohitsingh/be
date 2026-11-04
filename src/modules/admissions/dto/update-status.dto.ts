import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class UpdateApplicationStatusDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  status!: number;
}
