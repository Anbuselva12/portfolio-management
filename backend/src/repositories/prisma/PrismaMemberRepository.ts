import { Injectable } from '@nestjs/common';
import { Member } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IMemberRepository } from '../interfaces';

@Injectable()
export class PrismaMemberRepository implements IMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { id } });
  }

  async findByUsername(username: string): Promise<Member | null> {
    return this.prisma.member.findUnique({ where: { username } });
  }

  async findByFamilyId(familyId: string): Promise<Member[]> {
    return this.prisma.member.findMany({ where: { family_id: familyId } });
  }

  async findPendingByFamilyId(familyId: string): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: { family_id: familyId, status: 'pending_approval' },
    });
  }

  async create(data: any): Promise<Member> {
    return this.prisma.member.create({ data });
  }

  async update(id: string, data: Partial<Member>): Promise<Member> {
    return this.prisma.member.update({ where: { id }, data });
  }
}
