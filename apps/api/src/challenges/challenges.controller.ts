import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { ChallengesService } from './challenges.service';

@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}
  @Get() list(@CurrentUser() user?: AuthenticatedUser) { return this.challenges.list(user?.id); }
  @Get('mine') @UseGuards(JwtAuthGuard) mine(@CurrentUser() user: AuthenticatedUser) { return this.challenges.mine(user.id); }
  @Post(':id/join') @UseGuards(JwtAuthGuard) join(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.challenges.join(id,user.id);}
  @Delete(':id/join') @UseGuards(JwtAuthGuard) leave(@Param('id') id:string,@CurrentUser() user:AuthenticatedUser){return this.challenges.leave(id,user.id);}
}