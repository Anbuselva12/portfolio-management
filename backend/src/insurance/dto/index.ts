import { IsString, IsNumber, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateInsuranceDto {
  @IsString()
  policyType!: string;

  @IsString()
  provider!: string;

  @IsString()
  policyNumber!: string;

  @IsNumber()
  sumAssured!: number;

  @IsNumber()
  premiumAmount!: number;

  @IsString()
  @IsIn(['monthly', 'quarterly', 'annual'])
  premiumFrequency!: string;

  @IsDateString()
  nextDueDate!: string;

  @IsString()
  @IsOptional()
  linkedCategoryId?: string;
}

export class UpdateInsuranceDto {
  @IsString()
  @IsOptional()
  policyType?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsString()
  @IsOptional()
  policyNumber?: string;

  @IsNumber()
  @IsOptional()
  sumAssured?: number;

  @IsNumber()
  @IsOptional()
  premiumAmount?: number;

  @IsString()
  @IsOptional()
  @IsIn(['monthly', 'quarterly', 'annual'])
  premiumFrequency?: string;

  @IsDateString()
  @IsOptional()
  nextDueDate?: string;

  @IsString()
  @IsOptional()
  linkedCategoryId?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
