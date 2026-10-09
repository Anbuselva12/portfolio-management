import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { I_MEMBER_REPOSITORY, IMemberRepository } from '../../repositories/interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    @Inject(I_MEMBER_REPOSITORY) private readonly memberRepository: IMemberRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      secretOrKey: configService.get<string>('jwt.accessSecret') || 'dev-access-secret',
    });
  }

  /**
   * Token claims are never trusted for authorization: role, family and status are
   * reloaded so deactivation, rejection and role changes take effect immediately.
   */
  async validate(payload: any) {
    const member = await this.memberRepository.findById(payload.sub);
    if (!member || !member.is_active || member.status === 'deactivated') {
      throw new UnauthorizedException('Account is not active');
    }
    return {
      sub: member.id,
      username: member.username,
      familyId: member.family_id,
      role: member.role,
      status: member.status,
      isActive: true,
    };
  }
}
