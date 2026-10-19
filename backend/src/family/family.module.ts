import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { JwtModule } from '@nestjs/jwt';
import { FamilyMembershipService } from './family-membership.service';

@Module({
  imports: [JwtModule.register({})], // For signing a new token if needed
  controllers: [FamilyController],
  providers: [FamilyService, FamilyMembershipService],
  exports: [FamilyMembershipService],
})
export class FamilyModule {}
