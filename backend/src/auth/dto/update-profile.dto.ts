import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  preferredCurrency?: string;

  @IsOptional()
  @IsIn(['finfamily', 'expense_tracker'])
  preferredApp?: string;
}
