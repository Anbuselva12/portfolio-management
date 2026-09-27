import { IsString, IsBoolean, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateExpenseDto {
  @IsString()
  categoryId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  currency!: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  source?: string;
}

export class UpdateExpenseDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
