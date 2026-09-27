import { IsString, IsOptional, IsNumber, IsIn, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CustomWeightsDto {
  @IsOptional()
  @IsNumber()
  weightRate?: number = 40;

  @IsOptional()
  @IsNumber()
  weightBalance?: number = 30;

  @IsOptional()
  @IsNumber()
  weightFlexibility?: number = 10;

  @IsOptional()
  @IsNumber()
  weightPenalty?: number = 10;

  @IsOptional()
  @IsNumber()
  weightTenure?: number = 10;

  @IsOptional()
  @IsIn(['cascade', 'split'])
  mode?: 'cascade' | 'split' = 'cascade';
}

export class CompareStrategiesDto {
  @IsOptional()
  @IsString()
  surplusOverride?: string;

  @IsOptional()
  @IsIn(['one_off_lump_sum', 'recurring_monthly'])
  prepaymentMode?: 'one_off_lump_sum' | 'recurring_monthly' = 'one_off_lump_sum';

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomWeightsDto)
  customWeights?: CustomWeightsDto;

  @IsOptional()
  includeAi?: boolean = false;
}

export class SaveSnapshotDto {
  @IsString()
  strategyName: string;

  @IsString()
  surplus: string;

  allocations: any[];

  metrics: any;
}

