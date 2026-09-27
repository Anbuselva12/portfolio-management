import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { I_MEMBER_REPOSITORY, IMemberRepository, I_AUDIT_REPOSITORY, IAuditRepository } from '../repositories/interfaces';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly bcryptRounds: number;

  constructor(
    @Inject(I_MEMBER_REPOSITORY) private readonly memberRepository: IMemberRepository,
    @Inject(I_AUDIT_REPOSITORY) private readonly auditRepository: IAuditRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bcryptRounds = this.configService.get<number>('bcryptRounds') || 12;
  }

  async register(dto: RegisterDto) {
    const existing = await this.memberRepository.findByUsername(dto.username);
    if (existing) {
      throw new UnauthorizedException('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.bcryptRounds);

    const member = await this.memberRepository.create({
      username: dto.username,
      password_hash: hashedPassword,
      display_name: dto.displayName,
      preferred_currency: dto.preferredCurrency || 'INR',
      role: 'member',
      status: 'unaffiliated',
      is_active: true,
    });

    const tokens = await this.getTokens(member);
    await this.updateRefreshToken(member.id, tokens.refreshToken);

    return { member, ...tokens };
  }

  async login(dto: LoginDto) {
    const member = await this.memberRepository.findByUsername(dto.username);
    if (!member) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, member.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!member.is_active || member.status === 'deactivated') {
      throw new UnauthorizedException('Account is deactivated');
    }

    await this.memberRepository.update(member.id, { last_login_at: new Date() });
    
    await this.auditRepository.create({
      member_id: member.id,
      family_id: member.family_id,
      entity_type: 'member',
      entity_id: member.id,
      action: 'login',
    });

    const tokens = await this.getTokens(member);
    await this.updateRefreshToken(member.id, tokens.refreshToken);

    return { member, ...tokens };
  }

  async logout(memberId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { member_id: memberId, revoked: false },
      data: { revoked: true },
    });
  }

  async refreshTokens(memberId: string, refreshToken: string) {
    const member = await this.memberRepository.findById(memberId);
    if (!member || !member.is_active || member.status === 'deactivated') {
      throw new UnauthorizedException('Access Denied');
    }

    const tokenRecord = await this.prisma.refreshToken.findFirst({
      where: {
        member_id: memberId,
        revoked: false,
        expires_at: { gt: new Date() },
      },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Access Denied');
    }

    const isMatch = await bcrypt.compare(refreshToken, tokenRecord.token_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Access Denied');
    }

    const tokens = await this.getTokens(member);
    await this.updateRefreshToken(member.id, tokens.refreshToken);

    return { member, ...tokens };
  }

  async getMemberById(memberId: string) {
    return this.memberRepository.findById(memberId);
  }

  async changePassword(memberId: string, dto: ChangePasswordDto) {
    const member = await this.memberRepository.findById(memberId);
    if (!member) throw new UnauthorizedException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, member.password_hash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid current password');
    }

    const newHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds);
    await this.memberRepository.update(member.id, { password_hash: newHash });

    await this.auditRepository.create({
      member_id: member.id,
      family_id: member.family_id,
      entity_type: 'member',
      entity_id: member.id,
      action: 'password_reset',
    });
  }

  private async getTokens(member: any) {
    const payload = {
      sub: member.id,
      username: member.username,
      familyId: member.family_id,
      role: member.role,
      status: member.status,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(
        payload,
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expiresIn: (this.configService.get('jwt.refreshExpiresIn') ?? '7d') as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(memberId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    const expiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const days = parseInt(expiresIn, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isNaN(days) ? 7 : days));

    // Revoke old tokens
    await this.prisma.refreshToken.updateMany({
      where: { member_id: memberId, revoked: false },
      data: { revoked: true },
    });

    await this.prisma.refreshToken.create({
      data: {
        member_id: memberId,
        token_hash: hash,
        expires_at: expiresAt,
      },
    });
  }
}
