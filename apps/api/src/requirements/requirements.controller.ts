import { Body, Controller, Get, Param, Post, Req, UseGuards, Version } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/role.guards';
import { AccessTokenPayload } from '../auth/jwt.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { RequirementActionDto } from './dto/requirement-action.dto';
import { RequirementsService } from './requirements.service';
import type { Request } from 'express';

type AuthenticatedRequest = Request & { user: AccessTokenPayload };

@Controller('requirements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Post()
  @Version('1')
  @Roles('CLIENT')
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateRequirementDto) {
    return this.requirementsService.create(req.user.sub, dto);
  }

  @Get()
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  list(@Req() req: AuthenticatedRequest) {
    return this.requirementsService.listMine(req.user.sub, req.user.role as 'CLIENT' | 'WORKER');
  }

  @Get(':id')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  getOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.requirementsService.getOne(req.user.sub, req.user.role as 'CLIENT' | 'WORKER', id);
  }

  @Post(':id/accept')
  @Version('1')
  @Roles('WORKER')
  accept(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.requirementsService.accept(req.user.sub, id);
  }

  @Post(':id/reject')
  @Version('1')
  @Roles('WORKER')
  reject(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RequirementActionDto) {
    return this.requirementsService.reject(req.user.sub, id, dto);
  }

  @Post(':id/cancel')
  @Version('1')
  @Roles('CLIENT')
  cancel(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RequirementActionDto) {
    return this.requirementsService.cancel(req.user.sub, id, dto);
  }
}
