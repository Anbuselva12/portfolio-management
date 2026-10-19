import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { IsNumeric } from '../../income/dto/create-income.dto';

export class LoanAllocationItemDto {
  @IsString()
  projectId!: string;

  @IsNumeric()
  amount!: string | number;
}

/** Replaces every project allocation of a loan; an empty list clears the tag. */
export class SetLoanAllocationsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => LoanAllocationItemDto)
  allocations!: LoanAllocationItemDto[];
}
