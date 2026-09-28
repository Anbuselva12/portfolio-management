import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  const frontendUrl = process.env.FRONTEND_URL || config.get('FRONTEND_URL') || 'http://localhost:5173';
  const allowedOrigins = frontendUrl.includes(',')
    ? frontendUrl.split(',').map((u: string) => u.trim())
    : frontendUrl;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = config.get<number>('port') || 3000;
  await app.listen(port);
  logger.log(`FinFamily API listening on port ${port}`);
}
bootstrap();
