import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';

import type {Request} from 'express';

import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import type {AccessTokenPayload} from '../auth/jwt.service';

import {RolesGuard, Roles} from '../auth/guards/role.guards';

import {ClientsService} from './client.service';
import {UpdateClientLocationDto, UpdateClientProfileDto} from './dto/client.dto';

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
  ) {}

  @Get('me')
  @Version('1')
  getMyProfile(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.getMyProfile(
      request.user.sub,
    );
  }

  @Post('me')
  @Version('1')
  createProfile(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.clientsService.createMyProfile(
      request.user.sub,
    );
  }

  @Patch('me')
  @Version('1')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.clientsService.updateMyProfile(
      request.user.sub,
      dto,
    );
  }

  @Patch('me/location')
  @Version('1')
  updateLocation(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateClientLocationDto,
  ) {
    return this.clientsService.updateLocation(
      request.user.sub,
      dto,
    );
  }
}