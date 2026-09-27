import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { I_ASSET_REPOSITORY, IAssetRepository, I_AUDIT_REPOSITORY, IAuditRepository } from '../repositories/interfaces';
import { Decimal } from 'decimal.js';
import { diffObjects } from '../common/utils/audit.util';

@Injectable()
export class AssetsService {
  constructor(
    @Inject(I_ASSET_REPOSITORY) private readonly assetRepository: IAssetRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
  ) {}

  async getAssets(familyId: string) {
    const assets = await this.assetRepository.findByFamilyId(familyId);
    return assets.map(this.calculateProjectedMaturity);
  }

  async getAsset(familyId: string, id: string) {
    const asset = await this.assetRepository.findById(id);
    if (!asset || asset.family_id !== familyId) {
      throw new NotFoundException('Asset not found');
    }
    return this.calculateProjectedMaturity(asset);
  }

  async createAsset(memberId: string, familyId: string, dto: any) {
    const asset = await this.assetRepository.create({
      member_id: memberId,
      family_id: familyId,
      type: dto.type,
      name: dto.name,
      currency: dto.currency,
      current_value: new Decimal(dto.currentValue),
      principal_invested: dto.principalInvested ? new Decimal(dto.principalInvested) : null,
      maturity_date: dto.maturityDate ? new Date(dto.maturityDate) : null,
      interest_rate: dto.interestRate ? new Decimal(dto.interestRate) : null,
      notes: dto.notes,
    });

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'asset',
      entity_id: asset.id,
      action: 'create',
    });

    return this.calculateProjectedMaturity(asset);
  }

  async updateAsset(memberId: string, familyId: string, id: string, dto: any) {
    const existing = await this.assetRepository.findById(id);
    if (!existing || existing.family_id !== familyId) {
      throw new NotFoundException('Asset not found');
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.currentValue !== undefined) updateData.current_value = new Decimal(dto.currentValue);
    if (dto.principalInvested !== undefined) updateData.principal_invested = dto.principalInvested ? new Decimal(dto.principalInvested) : null;
    if (dto.maturityDate !== undefined) updateData.maturity_date = dto.maturityDate ? new Date(dto.maturityDate) : null;
    if (dto.interestRate !== undefined) updateData.interest_rate = dto.interestRate ? new Decimal(dto.interestRate) : null;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    const updated = await this.assetRepository.update(id, updateData);

    const diff = diffObjects(existing, updated);
    if (diff !== '{}') {
      await this.auditRepository.create({
        member_id: memberId,
        family_id: familyId,
        entity_type: 'asset',
        entity_id: id,
        action: 'update',
        field_changes: diff,
      });
    }

    return this.calculateProjectedMaturity(updated);
  }

  async deleteAsset(memberId: string, familyId: string, id: string) {
    const existing = await this.assetRepository.findById(id);
    if (!existing || existing.family_id !== familyId) {
      throw new NotFoundException('Asset not found');
    }

    await this.assetRepository.softDelete(id);

    await this.auditRepository.create({
      member_id: memberId,
      family_id: familyId,
      entity_type: 'asset',
      entity_id: id,
      action: 'delete',
    });

    return { message: 'Asset deleted' };
  }

  private calculateProjectedMaturity(asset: any) {
    let projected_maturity_value = null;

    if (['fd', 'rd'].includes(asset.type) && asset.principal_invested && asset.interest_rate && asset.maturity_date) {
      const P = new Decimal(asset.principal_invested);
      const r = new Decimal(asset.interest_rate).div(100);
      const f = new Decimal(4); // Quarterly compounding assumed for FD standard
      
      const today = new Date();
      const maturity = new Date(asset.maturity_date);
      const timeDiffMs = maturity.getTime() - today.getTime();
      const t = new Decimal(Math.max(0, timeDiffMs / (1000 * 60 * 60 * 24 * 365.25)));
      
      if (t.gt(0)) {
        // P * (1 + r/f)^(f*t)
        const base = new Decimal(1).plus(r.div(f));
        const exponent = f.times(t);
        projected_maturity_value = P.times(base.pow(exponent)).toFixed(2);
      }
    }

    return {
      ...asset,
      current_value: asset.current_value.toString(),
      principal_invested: asset.principal_invested?.toString(),
      interest_rate: asset.interest_rate?.toString(),
      projected_maturity_value,
    };
  }
}
