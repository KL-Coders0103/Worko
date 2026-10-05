import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MatchingService } from './matching.service';

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get(':id/matching')
  @Roles(UserRole.CLIENT)
  async getState(@CurrentUser() user: AuthenticatedUser, @Param('id') requirementId: string) {
    const state = await this.matching.getClientState(user.id, requirementId);
    return state ?? { data: null };
  }

  @Post(':id/matching/retry')
  @Roles(UserRole.CLIENT)
  async retry(@CurrentUser() user: AuthenticatedUser, @Param('id') requirementId: string) {
    const state = await this.matching.getClientState(user.id, requirementId);
    if (!state?.data) return { data: null };
    const result = await this.matching.retryMatching(user.id, requirementId);
    return { data: { ...result, ...(await this.matching.getClientState(user.id, requirementId))?.data } };
  }
}

@Controller('worker/offers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.WORKER)
export class WorkerOffersController {
  constructor(private readonly matching: MatchingService) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    return this.matching.getWorkerOffers(user.id);
  }

  @Post(':id/accept')
  async accept(@CurrentUser() user: AuthenticatedUser, @Param('id') offerId: string) {
    return { data: await this.matching.acceptOffer(user.id, offerId) };
  }

  @Post(':id/reject')
  async reject(@CurrentUser() user: AuthenticatedUser, @Param('id') offerId: string) {
    return { data: await this.matching.rejectOffer(user.id, offerId) };
  }
}
