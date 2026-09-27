import { Injectable, Inject, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  I_FAMILY_REPOSITORY,
  IFamilyRepository,
  I_MEMBER_REPOSITORY,
  IMemberRepository,
  I_AUDIT_REPOSITORY,
  IAuditRepository,
  I_EXPENSE_CATEGORY_REPOSITORY,
  IExpenseCategoryRepository,
  I_CURRENCY_RATE_REPOSITORY,
  ICurrencyRateRepository,
} from '../repositories/interfaces';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const DEFAULT_EXPENSE_CATEGORIES = [
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

@Injectable()
export class FamilyService {
  constructor(
    @Inject(I_FAMILY_REPOSITORY) private readonly familyRepository: IFamilyRepository,
    @Inject(I_MEMBER_REPOSITORY) private readonly memberRepository: IMemberRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    @Inject(I_EXPENSE_CATEGORY_REPOSITORY) private readonly expenseCategoryRepository: IExpenseCategoryRepository,
    @Inject(I_CURRENCY_RATE_REPOSITORY) private readonly currencyRateRepository: ICurrencyRateRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getDiscoverableFamilies() {
    return this.familyRepository.findDiscoverable();
  }

  async createFamily(memberId: string, dto: CreateFamilyDto) {
    const member = await this.memberRepository.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (member.family_id) throw new BadRequestException('Member already belongs to a family');

    const family = await this.familyRepository.create({
      name: dto.name,
      base_currency: dto.baseCurrency,
      country: dto.country,
      join_policy: dto.joinPolicy,
      is_discoverable: dto.isDiscoverable,
    });

    for (const catName of DEFAULT_EXPENSE_CATEGORIES) {
      await this.expenseCategoryRepository.create({
        name: catName,
        family_id: family.id,
      });
    }

    await this.memberRepository.update(memberId, {
      family_id: family.id,
      role: 'admin',
      status: 'active',
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: family.id,
      entity_type: 'family',
      entity_id: family.id,
      action: 'create',
    });

    const payload = {
      sub: member.id,
      username: member.username,
      familyId: family.id,
      role: 'admin',
      status: 'active',
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: (this.configService.get('jwt.accessExpiresIn') ?? '15m') as any,
    });

    return { family, accessToken };
  }

  async joinFamily(memberId: string, familyId: string) {
    const member = await this.memberRepository.findById(memberId);
    if (!member) throw new NotFoundException('Member not found');
    if (member.family_id) throw new BadRequestException('Member already belongs to a family');

    const family = await this.familyRepository.findById(familyId);
    if (!family) throw new NotFoundException('Family not found');

    const newStatus = family.join_policy === 'open' ? 'active' : 'pending_approval';

    await this.memberRepository.update(memberId, {
      family_id: family.id,
      status: newStatus,
      role: 'member',
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: family.id,
      entity_type: 'member',
      entity_id: memberId,
      action: 'update',
      field_changes: JSON.stringify({ family_id: { old: null, new: family.id }, status: { old: member.status, new: newStatus } })
    });

    return { message: `Successfully requested to join. Status: ${newStatus}` };
  }

  async getFamily(familyId: string) {
    const family = await this.familyRepository.findById(familyId);
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async getCurrencyRates(familyId: string) {
    return this.currencyRateRepository.findByFamilyId(familyId);
  }

  async upsertCurrencyRate(familyId: string, memberId: string, fromCurrency: string, toCurrency: string, rate: any) {
    const updated = await this.currencyRateRepository.upsertRate(
      familyId,
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase(),
      rate,
    );
    await this.auditRepository.create({
      family_id: familyId,
      member_id: memberId,
      entity_type: 'currency_rate',
      entity_id: updated.id,
      action: 'update',
      field_changes: JSON.stringify({ rate: { new: rate.toString() } }),
    });
    return updated;
  }

  async deleteCurrencyRate(familyId: string, memberId: string, id: string) {
    await this.currencyRateRepository.deleteRate(id);
    await this.auditRepository.create({
      family_id: familyId,
      member_id: memberId,
      entity_type: 'currency_rate',
      entity_id: id,
      action: 'delete',
    });
    return { success: true };
  }

  async updateFamilySettings(familyId: string, memberId: string, role: string, dto: any) {
    if (role !== 'admin') {
      throw new ForbiddenException('Only family administrators can update family settings.');
    }
    const family = await this.familyRepository.findById(familyId);
    if (!family) throw new NotFoundException('Family not found');

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.joinPolicy) updateData.join_policy = dto.joinPolicy;
    if (dto.isDiscoverable !== undefined) updateData.is_discoverable = dto.isDiscoverable;
    if (dto.strategyWeights) {
      updateData.strategy_weights =
        typeof dto.strategyWeights === 'string' ? dto.strategyWeights : JSON.stringify(dto.strategyWeights);
    }

    const updated = await this.familyRepository.update(familyId, updateData);
    await this.auditRepository.create({
      family_id: familyId,
      member_id: memberId,
      entity_type: 'family',
      entity_id: familyId,
      action: 'update',
      field_changes: JSON.stringify(dto),
    });
    return updated;
  }
}
