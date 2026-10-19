import { IsString, IsOptional, IsDateString } from 'class-validator';
import { IsNumeric } from './create-income.dto';

export class UpdateIncomeDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsNumeric()
  @IsOptional()
  amount?: string | number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsOptional()
  remindersEnabled?: boolean;

  @IsOptional()
  dueDayOfMonth?: number;

  /** Project tag: a project id sets it, `null` clears it, omitted leaves it unchanged. */
  @IsOptional()
  @IsString()
  projectId?: string | null;
}
