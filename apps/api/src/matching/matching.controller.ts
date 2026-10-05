import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchingService } from './matching.service';

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class MatchingController {
  constructor(private readonly matching: MatchingService) {}

  @Get(':id/matching')
  async getState(@CurrentUser() user: AuthenticatedUser, @Param('id') requirementId: string) {
    const state = await this.matching.getClientState(user.id, requirementId);
    return state ?? { data: null };
  }

  @Post(':id/matching/retry')
  async retry(@CurrentUser() user: AuthenticatedUser, @Param('id') requirementId: string) {
    const state = await this.matching.getClientState(user.id, requirementId);
    if (!state?.data) return { data: null };
    const result = await this.matching.retryMatching(user.id, requirementId);
    return { data: { ...result, ...(await this.matching.getClientState(user.id, requirementId))?.data } };
  }
}
