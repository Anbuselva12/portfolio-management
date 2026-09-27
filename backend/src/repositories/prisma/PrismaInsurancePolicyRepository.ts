import { Injectable } from '@nestjs/common';
import { InsurancePolicy } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IInsurancePolicyRepository } from '../interfaces';

@Injectable()
export class PrismaInsurancePolicyRepository implements IInsurancePolicyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<InsurancePolicy | null> {
    return this.prisma.insurancePolicy.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async findByMemberId(memberId: string): Promise<InsurancePolicy[]> {
    return this.prisma.insurancePolicy.findMany({
      where: { member_id: memberId, deleted_at: null },
    });
  }

  async findByFamilyId(familyId: string): Promise<InsurancePolicy[]> {
    return this.prisma.insurancePolicy.findMany({
      where: { family_id: familyId, deleted_at: null },
    });
  }

  async create(data: any): Promise<InsurancePolicy> {
    return this.prisma.insurancePolicy.create({ data });
  }

  async update(id: string, data: Partial<InsurancePolicy>): Promise<InsurancePolicy> {
    return this.prisma.insurancePolicy.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<InsurancePolicy> {
    return this.prisma.insurancePolicy.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async restore(id: string): Promise<InsurancePolicy> {
    return this.prisma.insurancePolicy.update({
      where: { id },
      data: { deleted_at: null },
    });
  }
}
