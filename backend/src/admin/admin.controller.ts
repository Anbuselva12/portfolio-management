import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard, ActiveMemberGuard)
@Roles('admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('members/pending')
  async getPendingMembers(@CurrentUser() user: any) {
    return this.adminService.getPendingMembers(user.familyId);
  }

  @Post('members/:id/approve')
  async approveMember(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.approveMember(user.sub, user.familyId, id);
  }

  @Post('members/:id/reject')
  async rejectMember(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.rejectMember(user.sub, user.familyId, id);
  }

  @Post('members')
  async inviteMember(@CurrentUser() user: any, @Body() dto: any) {
    // Requires a DTO in a complete implementation, here accepting raw for simplicity
    return this.adminService.inviteMember(user.sub, user.familyId, dto);
  }

  @Patch('members/:id')
  async updateMemberStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.adminService.updateMemberStatus(user.sub, user.familyId, id, dto.isActive);
  }

  @Post('members/:id/reset-password')
  async resetPassword(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.resetPassword(user.sub, user.familyId, id);
  }
}
