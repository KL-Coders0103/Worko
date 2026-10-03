import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirementsService } from './requirements.service';

@Controller('requirements')
@UseGuards(JwtAuthGuard)
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get('my')
  listMine(@CurrentUser() user: AuthenticatedUser) {
    return this.requirements.listForClient(user.id);
  }
}
