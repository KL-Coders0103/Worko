import { Controller, Get, Param, Post, Delete, UseGuards } from '@nestjs/common';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReelsService } from './reels.service';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reels: ReelsService) {}

  @Get()
  list() { return this.reels.listPublished(); }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  saved(@CurrentUser() user: AuthenticatedUser) { return this.reels.savedByUser(user.id); }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  save(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.reels.save(id, user.id); }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  unsave(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.reels.unsave(id, user.id); }
}
