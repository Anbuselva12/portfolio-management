import { Module } from '@nestjs/common';
import { FairShareController } from './fairshare.controller';
import { FairShareService } from './fairshare.service';

@Module({
  controllers: [FairShareController],
  providers: [FairShareService],
  exports: [FairShareService],
})
export class FairShareModule {}
