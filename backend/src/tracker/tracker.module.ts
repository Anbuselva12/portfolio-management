import { Module } from '@nestjs/common';
import { TrackerController } from './tracker.controller';
import { TrackerService } from './tracker.service';
import { ProjectFundingService } from './project-funding.service';

@Module({
  controllers: [TrackerController],
  providers: [TrackerService, ProjectFundingService],
  exports: [TrackerService, ProjectFundingService],
})
export class TrackerModule {}
