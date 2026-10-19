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

  /** One-off income only: corrects the date the income was received. */
  @IsDateString()
  @IsOptional()
  startDate?: string;

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
