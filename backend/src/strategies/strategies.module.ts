import { Module } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { StrategiesController } from './strategies.controller';
import { GeminiAiService } from './engine/gemini-ai.service';

@Module({
  controllers: [StrategiesController],
  providers: [StrategiesService, GeminiAiService],
  exports: [StrategiesService],
})
export class StrategiesModule {}

