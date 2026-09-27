import { SetMetadata } from '@nestjs/common';

export const IS_FAMILY_SCOPED_KEY = 'isFamilyScoped';
export const FamilyScoped = () => SetMetadata(IS_FAMILY_SCOPED_KEY, true);
