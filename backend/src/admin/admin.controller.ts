import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ActiveMemberGuard)
@Roles('admin')
@Controller('api/v1/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('members')
  async getAllMembers(@CurrentUser() user: any) {
    return this.adminService.getAllMembers(user.familyId);
  }

  @Get(['members/pending', 'pending'])
  async getPendingMembers(@CurrentUser() user: any) {
    return this.adminService.getPendingMembers(user.familyId);
  }

  @Get('members/:id/removal-impact')
  async removalImpact(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.getRemovalImpact(user.familyId, id);
  }

  @Delete('members/:id')
  async removeMember(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.removeMember(user.sub, user.familyId, id);
  }

  @Post(['members/:id/approve', 'approve/:id'])
  async approveMember(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.approveMember(user.sub, user.familyId, id);
  }

  @Post(['members/:id/reject', 'reject/:id'])
  async rejectMember(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.rejectMember(user.sub, user.familyId, id);
  }

  @Post(['members', 'invite'])
  async inviteMember(@CurrentUser() user: any, @Body() dto: InviteMemberDto) {
    return this.adminService.inviteMember(user.sub, user.familyId, dto);
  }

  @Patch(['members/:id', 'member/:id'])
  async updateMemberStatus(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateMemberStatusDto) {
    return this.adminService.updateMemberStatus(user.sub, user.familyId, id, dto.isActive);
  }

  @Post(['members/:id/reset-password', 'member/:id/reset-password'])
  async resetPassword(@CurrentUser() user: any, @Param('id') id: string) {
    return this.adminService.resetPassword(user.sub, user.familyId, id);
  }
}
