import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, validateSync } from 'class-validator';

enum StorageMode {
  Server = 'server',
  Local = 'local',
}

class EnvironmentVariables {
  @IsEnum(StorageMode)
  @IsOptional()
  STORAGE_MODE?: StorageMode;

  @IsNumber()
  @IsOptional()
  PORT?: number;

  @IsString()
  @IsOptional()
  JWT_ACCESS_SECRET?: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET?: string;

  @IsNumber()
  @IsOptional()
  BCRYPT_ROUNDS?: number;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string;

  @IsString()
  @IsOptional()
  DEFAULT_CURRENCY?: string;

  @IsString()
  @IsOptional()
  DEFAULT_COUNTRY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
