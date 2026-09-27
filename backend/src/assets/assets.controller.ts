import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ActiveMemberGuard } from '../common/guards/active-member.guard';
import { FamilyScopeGuard } from '../common/guards/family-scope.guard';
import { FamilyScoped } from '../common/decorators/family-scoped.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, ActiveMemberGuard, FamilyScopeGuard)
@FamilyScoped()
@Controller('api/v1/assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  async getAssets(@CurrentUser() user: any) {
    return this.assetsService.getAssets(user.familyId);
  }

  @Get(':id')
  async getAsset(@CurrentUser() user: any, @Param('id') id: string) {
    return this.assetsService.getAsset(user.familyId, id);
  }

  @Post()
  async createAsset(@CurrentUser() user: any, @Body() dto: any) {
    return this.assetsService.createAsset(user.sub, user.familyId, dto);
  }

  @Put(':id')
  async updateAsset(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    return this.assetsService.updateAsset(user.sub, user.familyId, id, dto);
  }

  @Delete(':id')
  async deleteAsset(@CurrentUser() user: any, @Param('id') id: string) {
    return this.assetsService.deleteAsset(user.sub, user.familyId, id);
  }
}
