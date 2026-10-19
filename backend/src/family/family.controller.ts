import { Controller, Get, Post, Patch, Put, Delete, Body, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FamilyMembershipService } from './family-membership.service';

@Controller('api/v1/families')
export class FamilyController {
  constructor(
    private readonly familyService: FamilyService,
    private readonly membership: FamilyMembershipService,
  ) {}

  @Get('discoverable')
  async getDiscoverableFamilies() {
    return this.familyService.getDiscoverableFamilies();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createFamily(@CurrentUser() user: any, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(user.sub, dto);
  }

  /** Skip family setup: use the app in a private solo workspace. */
  @UseGuards(JwtAuthGuard)
  @Post('skip')
  async skip(@CurrentUser() user: any) {
    return this.membership.skipFamily(user.sub);
  }

  /** Turn the caller's solo workspace into a family (data stays). */
  @UseGuards(JwtAuthGuard)
  @Post('current/convert')
  async convert(@CurrentUser() user: any, @Body() dto: CreateFamilyDto) {
    return this.membership.convertToFamily(user.sub, user.familyId, dto);
  }

  /** What leaving would delete for the caller. */
  @UseGuards(JwtAuthGuard)
  @Get('current/leave-impact')
  async leaveImpact(@CurrentUser() user: any) {
    return this.membership.getRemovalImpact(user.familyId, user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('current/leave')
  async leave(@CurrentUser() user: any) {
    return this.membership.leaveFamily(user.sub, user.familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications')
  async notifications(@CurrentUser() user: any) {
    if (user.role !== 'admin' || !user.familyId) return [];
    return this.membership.listNotifications(user.familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('notifications/:id/dismiss')
  async dismiss(@CurrentUser() user: any, @Param('id') id: string) {
    if (user.role !== 'admin') throw new ForbiddenException('Only admins can dismiss family notifications');
    return this.membership.dismissNotification(user.familyId, user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/join')
  async joinFamily(@CurrentUser() user: any, @Param('id') familyId: string) {
    return this.familyService.joinFamily(user.sub, familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('current')
  async getCurrentFamily(@CurrentUser() user: any) {
    return this.familyService.getFamily(user.familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('current/settings')
  async updateSettings(@CurrentUser() user: any, @Body() dto: any) {
    return this.familyService.updateFamilySettings(user.familyId, user.sub, user.role, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('currency-rates')
  async getCurrencyRates(@CurrentUser() user: any) {
    return this.familyService.getCurrencyRates(user.familyId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('currency-rates')
  async upsertCurrencyRate(@CurrentUser() user: any, @Body() dto: { fromCurrency: string; toCurrency: string; rate: any }) {
    return this.familyService.upsertCurrencyRate(user.familyId, user.sub, dto.fromCurrency, dto.toCurrency, dto.rate);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('currency-rates/:id')
  async deleteCurrencyRate(@CurrentUser() user: any, @Param('id') id: string) {
    return this.familyService.deleteCurrencyRate(user.familyId, user.sub, id);
  }
}
