import { IsDateString } from 'class-validator';

export class StopIncomeDto {
  @IsDateString()
  endDate!: string;
}
