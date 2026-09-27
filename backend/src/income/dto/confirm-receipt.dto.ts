import { IsOptional, IsString, IsDateString } from 'class-validator';
import { IsNumeric } from './create-income.dto';

export class ConfirmIncomeReceiptDto {
  @IsNumeric()
  receivedAmount!: string | number;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

