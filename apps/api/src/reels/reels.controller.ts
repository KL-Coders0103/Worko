import { Body, Controller, Get, Param, Post, Delete, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReelsService } from './reels.service';

@Controller('reels')
export class ReelsController {
  constructor(private readonly reels: ReelsService) {}

  @Get()
  list() { return this.reels.listPublished(); }

  @Get('creators/:id')
  creatorProfile(@Param('id') id: string) { return this.reels.creatorProfile(id); }

  @Get(':id/comments')
  comments(@Param('id') id: string) { return this.reels.listComments(id); }

  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  addComment(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() body: { content?: string }) {
    return this.reels.addComment(id, user.id, typeof body?.content === 'string' ? body.content : '');
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  saved(@CurrentUser() user: AuthenticatedUser) { return this.reels.savedByUser(user.id); }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  report(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reels.report(id, user.id);
  }

  @Post(':id/save')
  @UseGuards(JwtAuthGuard)
  save(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.reels.save(id, user.id); }

  @Delete(':id/save')
  @UseGuards(JwtAuthGuard)
  unsave(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.reels.unsave(id, user.id); }
}
