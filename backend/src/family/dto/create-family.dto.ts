import { IsString, IsBoolean, IsIn } from 'class-validator';

export class CreateFamilyDto {
  @IsString()
  name!: string;

  @IsString()
  baseCurrency!: string;

  @IsString()
  country!: string;

  @IsString()
  @IsIn(['open', 'approval_required'])
  joinPolicy!: string;

  @IsBoolean()
  isDiscoverable!: boolean;
}
