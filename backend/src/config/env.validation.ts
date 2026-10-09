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

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_MARKERS = ['replace-with', 'your-', 'dev-', 'changeme'];

function assertStrongSecret(name: string, value: unknown) {
  const secret = typeof value === 'string' ? value : '';
  const isPlaceholder = PLACEHOLDER_MARKERS.some((marker) => secret.toLowerCase().includes(marker));
  if (secret.length < MIN_SECRET_LENGTH || isPlaceholder) {
    throw new Error(`${name} must be a unique random value of at least ${MIN_SECRET_LENGTH} characters in production`);
  }
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (config.NODE_ENV === 'production') {
    assertStrongSecret('JWT_ACCESS_SECRET', config.JWT_ACCESS_SECRET);
    assertStrongSecret('JWT_REFRESH_SECRET', config.JWT_REFRESH_SECRET);
    if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
    }
  }
  return validatedConfig;
}
