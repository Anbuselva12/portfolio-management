import { Injectable } from '@nestjs/common';
import { Family } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IFamilyRepository } from '../interfaces';

@Injectable()
export class PrismaFamilyRepository implements IFamilyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Family | null> {
    return this.prisma.family.findUnique({ where: { id } });
  }

  async findDiscoverable(): Promise<Family[]> {
    return this.prisma.family.findMany({
      where: { is_discoverable: true, is_personal: false },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });
  }

  async create(data: {
    name: string;
    base_currency: string;
    country: string;
    join_policy: string;
    is_discoverable: boolean;
  }): Promise<Family> {
    return this.prisma.family.create({ data });
  }

  async update(id: string, data: Partial<Family>): Promise<Family> {
    return this.prisma.family.update({ where: { id }, data });
  }
}
