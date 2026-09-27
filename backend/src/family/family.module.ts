import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { FamilyService } from './family.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule.register({})], // For signing a new token if needed
  controllers: [FamilyController],
  providers: [FamilyService],
})
export class FamilyModule {}
