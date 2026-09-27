import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { AuditService } from './audit.service';

@Controller('api/v1/audit')
@UseGuards(JwtAuthGuard, ActiveMemberGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async getAuditLogs(@Req() req: any, @Query() query: any) {
    const familyId = req.user.familyId;
    const memberId = req.user.sub || req.user.id;
    const role = req.user.role;
    return this.auditService.getAuditLogs(familyId, memberId, role, query);
  }

  @Post('restore/:entityType/:id')
  async restoreEntity(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('id') id: string,
  ) {
    const familyId = req.user.familyId;
    const memberId = req.user.sub || req.user.id;
    const role = req.user.role;
    return this.auditService.restoreEntity(familyId, memberId, role, entityType, id);
  }
}
