import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { StrategiesService } from './strategies.service';
import { CompareStrategiesDto, SaveSnapshotDto } from './dto';

@Controller('api/v1/strategies')
@UseGuards(JwtAuthGuard, ActiveMemberGuard)
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Post('compare')
  async compareStrategies(@Req() req: any, @Body() dto: CompareStrategiesDto) {
    const familyId = req.user.familyId;
    const memberId = req.user.sub || req.user.id;
    return this.strategiesService.compareStrategies(familyId, memberId, dto || {});
  }

  @Post('snapshot')
  async saveSnapshot(@Req() req: any, @Body() dto: SaveSnapshotDto) {
    const familyId = req.user.familyId;
    const memberId = req.user.sub || req.user.id;
    return this.strategiesService.saveSnapshot(familyId, memberId, dto);
  }

  @Get('snapshot')
  async getLatestSnapshot(@Req() req: any) {
    const familyId = req.user.familyId;
    return this.strategiesService.getLatestSnapshot(familyId);
  }
}
