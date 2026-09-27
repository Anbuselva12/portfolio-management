import { IsString, IsOptional, IsDateString, IsIn, ValidateBy, ValidationOptions } from 'class-validator';

export function IsNumeric(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isNumeric',
      validator: {
        validate: (value: any) => {
          if (value === null || value === undefined || value === '') return false;
          if (typeof value === 'number') return !isNaN(value) && isFinite(value);
          if (typeof value === 'string') return value.trim() !== '' && !isNaN(Number(value));
          return false;
        },
        defaultMessage: () => 'amount must be a valid number or numeric string',
      },
    },
    validationOptions,
  );
}

export class CreateIncomeDto {
  @IsString()
  type!: string;

  @IsString()
  label!: string;

  @IsNumeric()
  amount!: string | number;

  @IsString()
  currency!: string;

  @IsString()
  @IsIn(['recurring_monthly', 'one_off'])
  recurrence!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsOptional()
  remindersEnabled?: boolean;

  @IsOptional()
  dueDayOfMonth?: number;
}
