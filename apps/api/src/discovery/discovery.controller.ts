import {
  Controller,
  Get,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/role.guards';

import { DiscoveryService } from './discovery.service';

@Controller('discovery')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
  ) {}

  @Get('workers')
  @Version('1')
  getWorkers(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('skill') skill?: string,
    @Query('available') available?: string,
    @Query('verified') verified?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.discoveryService.getWorkers({
      search,
      category,
      skill,
      available,
      verified,
      latitude,
      longitude,
      radiusKm,
    });
  }
}