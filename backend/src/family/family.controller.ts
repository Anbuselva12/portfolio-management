import { Controller, Get, Post, Patch, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FamilyService } from './family.service';
import { CreateFamilyDto } from './dto/create-family.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/families')
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Get('discoverable')
  async getDiscoverableFamilies() {
    return this.familyService.getDiscoverableFamilies();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createFamily(@CurrentUser() user: any, @Body() dto: CreateFamilyDto) {
    return this.familyService.createFamily(user.sub, dto);
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
