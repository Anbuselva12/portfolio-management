import { Injectable } from '@nestjs/common';
import { Asset } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IAssetRepository } from '../interfaces';

@Injectable()
export class PrismaAssetRepository implements IAssetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Asset | null> {
    return this.prisma.asset.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async findByMemberId(memberId: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: { member_id: memberId, deleted_at: null },
    });
  }

  async findByFamilyId(familyId: string): Promise<Asset[]> {
    return this.prisma.asset.findMany({
      where: { family_id: familyId, deleted_at: null },
    });
  }

  async create(data: any): Promise<Asset> {
    return this.prisma.asset.create({ data });
  }

  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    return this.prisma.asset.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: string): Promise<Asset> {
    return this.prisma.asset.update({
      where: { id },
      data: { deleted_at: null },
    });
  }
}
