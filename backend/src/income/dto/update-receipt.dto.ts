import { IsOptional, IsString, IsDateString } from 'class-validator';
import { IsNumeric } from './create-income.dto';

/** Corrects an already-recorded monthly receipt. Omitted fields stay unchanged. */
export class UpdateIncomeReceiptDto {
  @IsOptional()
  @IsNumeric()
  receivedAmount?: string | number;

  @IsOptional()
  @IsDateString()
  receivedDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
