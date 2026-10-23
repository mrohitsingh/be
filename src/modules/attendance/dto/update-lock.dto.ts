import { IsBoolean, IsNotEmpty } from 'class-validator';

export class UpdateSessionLockDto {
  @IsBoolean()
  @IsNotEmpty()
  is_locked!: boolean;
}
