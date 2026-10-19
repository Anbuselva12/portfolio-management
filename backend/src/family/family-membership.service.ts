import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateFamilyDto } from './dto/create-family.dto';

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Groceries',
  'Electricity',
  'Gas/LPG',
  'Internet',
  'Fuel',
  'Medical',
  'Education',
  'Dining Out',
  'Entertainment',
  'Rent',
  'Others',
];

export interface RemovalImpact {
  assets: number;
  incomes: number;
  receipts: number;
  loans: number;
  expenses: number;
  insurance: number;
  projectExpenses: number;
}

type Tx = Prisma.TransactionClient;

/**
 * Family membership lifecycle (SDD §4.12): solo workspaces, turning a solo workspace into a family,
 * moving a solo user's data into a family they join, removing a member together with everything they
 * contributed, and the notifications admins see afterwards.
 */
@Injectable()
export class FamilyMembershipService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Solo workspace ───────────────────────────────────────────────────────

  /** Puts a member without a family into their own hidden workspace (reusing an earlier one if it exists). */
  async skipFamily(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');
    if (member.family_id)
      throw new BadRequestException('You already have a workspace');

    const workspace = await this.prisma.$transaction(async (tx) => {
      let family = await tx.family.findFirst({
        where: { is_personal: true, owner_member_id: memberId },
      });
      if (!family) {
        family = await tx.family.create({
          data: {
            name: `${member.display_name}'s workspace`,
            base_currency: member.preferred_currency || 'INR',
            country: 'IN',
            join_policy: 'approval_required',
            is_discoverable: false,
            is_personal: true,
            owner_member_id: memberId,
          },
        });
        await tx.expenseCategory.createMany({
          data: DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
            name,
            family_id: family!.id,
          })),
        });
      }
      await tx.member.update({
        where: { id: memberId },
        data: { family_id: family.id, role: 'admin', status: 'active' },
      });
      await tx.auditLogEntry.create({
        data: {
          member_id: memberId,
          family_id: family.id,
          entity_type: 'family',
          entity_id: family.id,
          action: 'create',
          field_changes: JSON.stringify({ workspace: 'personal' }),
        },
      });
      return family;
    });
    return { familyId: workspace.id, isPersonal: true };
  }

  /** Turns the caller's solo workspace into a real family; all their data stays where it is. */
  async convertToFamily(
    memberId: string,
    familyId: string,
    dto: CreateFamilyDto,
  ) {
    const family = await this.requirePersonalWorkspace(memberId, familyId);
    const updated = await this.prisma.family.update({
      where: { id: family.id },
      data: {
        name: dto.name.trim(),
        base_currency: dto.baseCurrency,
        country: dto.country,
        join_policy: dto.joinPolicy,
        is_discoverable: dto.isDiscoverable,
        is_personal: false,
      },
    });
    await this.prisma.auditLogEntry.create({
      data: {
        member_id: memberId,
        family_id: family.id,
        entity_type: 'family',
        entity_id: family.id,
        action: 'update',
        field_changes: JSON.stringify({
          is_personal: { old: true, new: false },
          name: { old: family.name, new: updated.name },
        }),
      },
    });
    return updated;
  }

  // ─── Joining an existing family ───────────────────────────────────────────

  /**
   * Requests to join a family. Allowed for members with no workspace and for solo users (whose own data is
   * moved in once they become active). Open families activate immediately; others wait for an admin.
   */
  async joinFamily(memberId: string, targetFamilyId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member) throw new NotFoundException('Member not found');
    const target = await this.prisma.family.findUnique({
      where: { id: targetFamilyId },
    });
    if (!target || target.is_personal)
      throw new NotFoundException('Family not found');

    if (member.family_id) {
      const current = await this.prisma.family.findUnique({
        where: { id: member.family_id },
      });
      const isOwnSolo =
        !!current &&
        current.is_personal &&
        current.owner_member_id === memberId;
      if (!isOwnSolo)
        throw new BadRequestException('Member already belongs to a family');
    }
    if (member.family_id === target.id)
      throw new BadRequestException('You are already in this family');

    const status =
      target.join_policy === 'open' ? 'active' : 'pending_approval';
    await this.prisma.$transaction(async (tx) => {
      await tx.member.update({
        where: { id: memberId },
        data: { family_id: target.id, status, role: 'member' },
      });
      if (status === 'active') await this.moveSoloData(tx, memberId, target.id);
      await tx.auditLogEntry.create({
        data: {
          member_id: memberId,
          family_id: target.id,
          entity_type: 'member',
          entity_id: memberId,
          action: 'update',
          field_changes: JSON.stringify({
            family_id: { old: member.family_id, new: target.id },
            status: { old: member.status, new: status },
          }),
        },
      });
    });
    return {
      message: `Successfully requested to join. Status: ${status}`,
      status,
    };
  }

  /** Called when an admin approves a join request: brings the member's solo data into the family. */
  async onJoinApproved(tx: Tx, memberId: string, familyId: string) {
    await this.moveSoloData(tx, memberId, familyId);
  }

  /** Called when an admin rejects a join request: a solo user goes back to their own workspace. */
  async restoreAfterRejection(tx: Tx, memberId: string) {
    const solo = await tx.family.findFirst({
      where: { is_personal: true, owner_member_id: memberId },
    });
    await tx.member.update({
      where: { id: memberId },
      data: solo
        ? { family_id: solo.id, status: 'active', role: 'admin' }
        : { family_id: null, status: 'unaffiliated', role: 'member' },
    });
  }

  /** Moves everything in the member's solo workspace into the target family, mapping expense categories by name. */
  private async moveSoloData(tx: Tx, memberId: string, toFamilyId: string) {
    const solo = await tx.family.findFirst({
      where: { is_personal: true, owner_member_id: memberId },
    });
    if (!solo || solo.id === toFamilyId) return;
    const from = solo.id;

    const [fromCats, toCats] = await Promise.all([
      tx.expenseCategory.findMany({ where: { family_id: from } }),
      tx.expenseCategory.findMany({ where: { family_id: toFamilyId } }),
    ]);
    const byName = new Map(
      toCats.map((c) => [c.name.trim().toLowerCase(), c.id]),
    );
    for (const cat of fromCats) {
      let targetId = byName.get(cat.name.trim().toLowerCase());
      const used =
        (await tx.expenseEntry.count({
          where: { family_id: from, category_id: cat.id },
        })) +
        (await tx.insurancePolicy.count({
          where: { family_id: from, linked_category_id: cat.id },
        }));
      if (!used) continue;
      if (!targetId) {
        targetId = (
          await tx.expenseCategory.create({
            data: {
              name: cat.name,
              icon: cat.icon,
              color: cat.color,
              family_id: toFamilyId,
            },
          })
        ).id;
        byName.set(cat.name.trim().toLowerCase(), targetId);
      }
      await tx.expenseEntry.updateMany({
        where: { family_id: from, category_id: cat.id },
        data: { family_id: toFamilyId, category_id: targetId },
      });
      await tx.insurancePolicy.updateMany({
        where: { family_id: from, linked_category_id: cat.id },
        data: { family_id: toFamilyId, linked_category_id: targetId },
      });
    }

    const move = {
      where: { family_id: from },
      data: { family_id: toFamilyId },
    };
    await tx.expenseEntry.updateMany(move);
    await tx.insurancePolicy.updateMany(move);
    await tx.asset.updateMany(move);
    await tx.incomeEntry.updateMany(move);
    await tx.monthlyIncomeReceipt.updateMany(move);
    await tx.loan.updateMany(move);
    await tx.trackerProject.updateMany(move);
    await tx.suggestionSnapshot.deleteMany({ where: { family_id: from } });
  }

  // ─── Removing a member ────────────────────────────────────────────────────

  /** What removing this member would delete. */
  async getRemovalImpact(
    familyId: string,
    memberId: string,
  ): Promise<RemovalImpact> {
    await this.requireMemberOfFamily(familyId, memberId);
    const loanIds = (
      await this.prisma.loan.findMany({
        where: { family_id: familyId, member_id: memberId },
        select: { id: true },
      })
    ).map((l) => l.id);
    const incomeIds = (
      await this.prisma.incomeEntry.findMany({
        where: { family_id: familyId, member_id: memberId },
        select: { id: true },
      })
    ).map((i) => i.id);
    const [assets, receipts, expenses, insurance, projectExpenses] =
      await Promise.all([
        this.prisma.asset.count({
          where: { family_id: familyId, member_id: memberId, deleted_at: null },
        }),
        this.prisma.monthlyIncomeReceipt.count({
          where: {
            family_id: familyId,
            OR: [{ member_id: memberId }, { income_id: { in: incomeIds } }],
          },
        }),
        this.prisma.expenseEntry.count({
          where: { family_id: familyId, member_id: memberId, deleted_at: null },
        }),
        this.prisma.insurancePolicy.count({
          where: { family_id: familyId, member_id: memberId, deleted_at: null },
        }),
        this.prisma.trackerExpense.count({
          where: { created_by_id: memberId, project: { family_id: familyId } },
        }),
      ]);
    return {
      assets,
      incomes: incomeIds.length,
      receipts,
      loans: loanIds.length,
      expenses,
      insurance,
      projectExpenses,
    };
  }

  /** Admin removes another member: their contributions are deleted permanently and admins are notified. */
  async removeMember(adminId: string, familyId: string, targetId: string) {
    if (adminId === targetId)
      throw new BadRequestException(
        'You cannot remove yourself. Ask another admin, or leave from Settings.',
      );
    const target = await this.requireMemberOfFamily(familyId, targetId);
    const admin = await this.prisma.member.findUnique({
      where: { id: adminId },
    });
    return this.detach(
      familyId,
      target,
      'member_removed',
      admin?.display_name ?? 'An admin',
      adminId,
    );
  }

  /** A member leaves the family themselves. The only admin cannot leave while others remain. */
  async leaveFamily(memberId: string, familyId: string) {
    const member = await this.requireMemberOfFamily(familyId, memberId);
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (family?.is_personal)
      throw new BadRequestException(
        'This is your personal workspace, not a family',
      );
    if (member.role === 'admin') {
      const otherAdmins = await this.prisma.member.count({
        where: {
          family_id: familyId,
          role: 'admin',
          id: { not: memberId },
          status: 'active',
        },
      });
      const others = await this.prisma.member.count({
        where: { family_id: familyId, id: { not: memberId } },
      });
      if (!otherAdmins && others)
        throw new BadRequestException(
          'You are the only admin. Remove the other members first.',
        );
    }
    return this.detach(
      familyId,
      member,
      'member_left',
      member.display_name,
      memberId,
    );
  }

  private async detach(
    familyId: string,
    member: { id: string; display_name: string; username: string },
    type: 'member_removed' | 'member_left',
    actorName: string,
    actorId: string,
  ) {
    const impact = await this.getRemovalImpact(familyId, member.id);
    await this.prisma.$transaction(async (tx) => {
      await this.deleteContributions(tx, familyId, member.id);
      await tx.member.update({
        where: { id: member.id },
        data: { family_id: null, status: 'unaffiliated', role: 'member' },
      });
      await tx.refreshToken.updateMany({
        where: { member_id: member.id, revoked: false },
        data: { revoked: true },
      });
      const summary = summarise(impact);
      await tx.familyNotification.create({
        data: {
          family_id: familyId,
          type,
          title:
            type === 'member_left'
              ? `${member.display_name} left the family`
              : `${member.display_name} was removed from the family`,
          message:
            (type === 'member_left'
              ? `${member.display_name} (@${member.username}) left.`
              : `${actorName} removed ${member.display_name} (@${member.username}).`) +
            ` Their contributions were deleted: ${summary}.`,
        },
      });
      await tx.auditLogEntry.create({
        data: {
          member_id: actorId,
          family_id: familyId,
          entity_type: 'member',
          entity_id: member.id,
          action: 'delete',
          field_changes: JSON.stringify({ membership: type, deleted: impact }),
        },
      });
    });
    return {
      message:
        type === 'member_left' ? 'You left the family' : 'Member removed',
      deleted: impact,
    };
  }

  private async deleteContributions(
    tx: Tx,
    familyId: string,
    memberId: string,
  ) {
    const loanIds = (
      await tx.loan.findMany({
        where: { family_id: familyId, member_id: memberId },
        select: { id: true },
      })
    ).map((l) => l.id);
    const incomeIds = (
      await tx.incomeEntry.findMany({
        where: { family_id: familyId, member_id: memberId },
        select: { id: true },
      })
    ).map((i) => i.id);

    if (loanIds.length) {
      await tx.projectLoanAllocation.deleteMany({
        where: { loan_id: { in: loanIds } },
      });
      await tx.repaymentInstallment.deleteMany({
        where: { loan_id: { in: loanIds } },
      });
      await tx.prepaymentRecord.deleteMany({
        where: { loan_id: { in: loanIds } },
      });
      await tx.rateRevisionRecord.deleteMany({
        where: { loan_id: { in: loanIds } },
      });
      await tx.expenseEntry.deleteMany({ where: { loan_id: { in: loanIds } } });
    }
    await tx.monthlyIncomeReceipt.deleteMany({
      where: {
        family_id: familyId,
        OR: [{ member_id: memberId }, { income_id: { in: incomeIds } }],
      },
    });
    await tx.expenseEntry.deleteMany({
      where: { family_id: familyId, member_id: memberId },
    });
    await tx.insurancePolicy.deleteMany({
      where: { family_id: familyId, member_id: memberId },
    });
    await tx.asset.deleteMany({
      where: { family_id: familyId, member_id: memberId },
    });
    if (incomeIds.length) {
      // Revisions point at each other; clear the links before deleting the chain.
      await tx.incomeEntry.updateMany({
        where: { id: { in: incomeIds } },
        data: { superseded_by_id: null },
      });
      await tx.incomeEntry.deleteMany({ where: { id: { in: incomeIds } } });
    }
    if (loanIds.length)
      await tx.loan.deleteMany({ where: { id: { in: loanIds } } });
    await tx.trackerExpense.deleteMany({
      where: { created_by_id: memberId, project: { family_id: familyId } },
    });
    await tx.suggestionSnapshot.deleteMany({
      where: { family_id: familyId, member_id: memberId },
    });
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  async listNotifications(familyId: string) {
    return this.prisma.familyNotification.findMany({
      where: { family_id: familyId, dismissed_at: null },
      orderBy: { created_at: 'desc' },
      take: 20,
    });
  }

  async dismissNotification(familyId: string, memberId: string, id: string) {
    const n = await this.prisma.familyNotification.findUnique({
      where: { id },
    });
    if (!n || n.family_id !== familyId)
      throw new NotFoundException('Notification not found');
    await this.prisma.familyNotification.update({
      where: { id },
      data: { dismissed_at: new Date(), dismissed_by_id: memberId },
    });
    return { success: true };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async requirePersonalWorkspace(memberId: string, familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family || !family.is_personal || family.owner_member_id !== memberId) {
      throw new ForbiddenException(
        'Only the owner of a personal workspace can do this',
      );
    }
    return family;
  }

  private async requireMemberOfFamily(familyId: string, memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member || member.family_id !== familyId)
      throw new NotFoundException('Member not found in family');
    return member;
  }
}

const plural = (n: number, label: string): string =>
  `${n} ${n === 1 ? label : label === 'insurance policy' ? 'insurance policies' : `${label}s`}`;

function summarise(i: RemovalImpact): string {
  const parts: Array<[number, string]> = [
    [i.assets, 'asset'],
    [i.incomes, 'income stream'],
    [i.receipts, 'income receipt'],
    [i.loans, 'loan'],
    [i.expenses, 'expense'],
    [i.insurance, 'insurance policy'],
    [i.projectExpenses, 'project expense'],
  ];
  const text = parts
    .filter(([n]) => n > 0)
    .map(([n, label]) => plural(n, label));
  return text.length ? text.join(', ') : 'nothing';
}
