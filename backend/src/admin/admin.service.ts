import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { I_MEMBER_REPOSITORY, IMemberRepository, I_AUDIT_REPOSITORY, IAuditRepository } from '../repositories/interfaces';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  private readonly bcryptRounds: number;

  constructor(
    @Inject(I_MEMBER_REPOSITORY) private readonly memberRepository: IMemberRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    private readonly configService: ConfigService,
  ) {
    this.bcryptRounds = this.configService.get<number>('bcryptRounds') || 12;
  }

  async getPendingMembers(familyId: string) {
    return this.memberRepository.findPendingByFamilyId(familyId);
  }

  async getAllMembers(familyId: string) {
    return this.memberRepository.findByFamilyId(familyId);
  }

  async approveMember(adminId: string, familyId: string, targetId: string) {
    const target = await this.memberRepository.findById(targetId);
    if (!target || target.family_id !== familyId || target.status !== 'pending_approval') {
      throw new BadRequestException('Invalid member or not pending');
    }

    await this.memberRepository.update(targetId, { status: 'active' });
    await this.auditRepository.create({
      member_id: adminId,
      family_id: familyId,
      entity_type: 'member',
      entity_id: targetId,
      action: 'approve',
    });

    return { message: 'Member approved' };
  }

  async rejectMember(adminId: string, familyId: string, targetId: string) {
    const target = await this.memberRepository.findById(targetId);
    if (!target || target.family_id !== familyId || target.status !== 'pending_approval') {
      throw new BadRequestException('Invalid member or not pending');
    }

    await this.memberRepository.update(targetId, { status: 'unaffiliated', family_id: null });
    await this.auditRepository.create({
      member_id: adminId,
      family_id: familyId,
      entity_type: 'member',
      entity_id: targetId,
      action: 'reject',
    });

    return { message: 'Member rejected' };
  }

  async inviteMember(adminId: string, familyId: string, dto: any) {
    const existing = await this.memberRepository.findByUsername(dto.username);
    if (existing) {
      throw new BadRequestException('Username already exists');
    }

    const tempPassword = dto.password || Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, this.bcryptRounds);

    const member = await this.memberRepository.create({
      username: dto.username,
      password_hash: hashedPassword,
      display_name: dto.displayName,
      preferred_currency: dto.preferredCurrency,
      role: 'member',
      status: 'active',
      is_active: true,
      family_id: familyId,
    });

    await this.auditRepository.create({
      member_id: adminId,
      family_id: familyId,
      entity_type: 'member',
      entity_id: member.id,
      action: 'create',
    });

    return { member, tempPassword };
  }

  async updateMemberStatus(adminId: string, familyId: string, targetId: string, isActive: boolean) {
    const target = await this.memberRepository.findById(targetId);
    if (!target || target.family_id !== familyId) {
      throw new NotFoundException('Member not found in family');
    }

    const newStatus = isActive ? 'active' : 'deactivated';

    await this.memberRepository.update(targetId, { is_active: isActive, status: newStatus });
    await this.auditRepository.create({
      member_id: adminId,
      family_id: familyId,
      entity_type: 'member',
      entity_id: targetId,
      action: 'update',
      field_changes: JSON.stringify({ is_active: { old: target.is_active, new: isActive } }),
    });

    return { message: 'Member status updated' };
  }

  async resetPassword(adminId: string, familyId: string, targetId: string) {
    const target = await this.memberRepository.findById(targetId);
    if (!target || target.family_id !== familyId) {
      throw new NotFoundException('Member not found in family');
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, this.bcryptRounds);

    await this.memberRepository.update(targetId, { password_hash: hashedPassword });
    await this.auditRepository.create({
      member_id: adminId,
      family_id: familyId,
      entity_type: 'member',
      entity_id: targetId,
      action: 'password_reset',
    });

    return { message: 'Password reset', newPassword: tempPassword };
  }
}
