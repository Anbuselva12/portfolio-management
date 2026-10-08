import { IsString, IsNotEmpty, IsNumberString, IsInt, Min, IsOptional, IsDateString, IsIn, IsBoolean } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  placeOrPurpose?: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsBoolean()
  @IsOptional()
  emiRemindersEnabled?: boolean;

  @IsString()
  @IsNotEmpty()
  type!: string; // home | car | personal | jewel | education | business | gold | other

  @IsString()
  @IsNotEmpty()
  lender!: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumberString()
  @IsNotEmpty()
  principal!: string;

  @IsString()
  @IsIn(['reducing_compound', 'flat_simple'])
  @IsOptional()
  interestType?: string;

  @IsString()
  @IsOptional()
  compoundingFrequency?: string;

  @IsNumberString()
  @IsNotEmpty()
  interestRate!: string;

  @IsInt()
  @Min(1)
  tenureMonths!: number;

  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsNumberString()
  @IsOptional()
  userEmiInput?: string;

  @IsString()
  @IsIn(['fixed', 'flexible'])
  @IsOptional()
  emiType?: string;

  @IsString()
  @IsOptional()
  prepaymentPenaltyType?: string;

  @IsNumberString()
  @IsOptional()
  prepaymentPenaltyValue?: string;
}

export class UpdateLoanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  placeOrPurpose?: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsBoolean()
  @IsOptional()
  emiRemindersEnabled?: boolean;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  lender?: string;

  @IsNumberString()
  @IsOptional()
  interestRate?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  tenureMonths?: number;

  @IsNumberString()
  @IsOptional()
  userEmiInput?: string;

  @IsString()
  @IsOptional()
  emiType?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  closureReason?: string;

  @IsString()
  @IsOptional()
  closureNotes?: string;

  @IsDateString()
  @IsOptional()
  closedAt?: string;
}

export class CloseLoanDto {
  @IsString()
  @IsOptional()
  closureReason?: string;

  @IsString()
  @IsOptional()
  closureNotes?: string;

  @IsDateString()
  @IsOptional()
  closedAt?: string;
}

export class PrepaymentPreviewDto {
  @IsNumberString()
  @IsNotEmpty()
  amount!: string;

  @IsDateString()
  @IsNotEmpty()
  date!: string;

  @IsString()
  @IsIn(['reduce_tenure', 'reduce_emi'])
  mode!: 'reduce_tenure' | 'reduce_emi';

  @IsNumberString()
  @IsOptional()
  accruedInterest?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ApplyPrepaymentDto extends PrepaymentPreviewDto {}

export class RateRevisionDto {
  @IsNumberString()
  @IsNotEmpty()
  newRate!: string;

  @IsString()
  @IsIn(['keep_emi', 'keep_tenure'])
  policy!: 'keep_emi' | 'keep_tenure';

  @IsDateString()
  @IsNotEmpty()
  effectiveDate!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CalibrateLoanDto {
  @IsNumberString()
  @IsNotEmpty()
  currentOutstanding!: string;

  @IsInt()
  @Min(1)
  remainingTenureMonths!: number;

  @IsNumberString()
  @IsNotEmpty()
  currentRate!: string;

  @IsNumberString()
  @IsNotEmpty()
  emiAmount!: string;

  @IsDateString()
  @IsNotEmpty()
  effectiveDate!: string;
}

export class UpdateInstallmentDto {
  @IsNumberString()
  @IsOptional()
  emiAmount?: string;

  @IsNumberString()
  @IsOptional()
  principalComponent?: string;

  @IsNumberString()
  @IsOptional()
  interestComponent?: string;

  @IsOptional()
  isPaid?: boolean;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

