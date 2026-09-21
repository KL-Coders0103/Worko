import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  StreamableFile,
  UseGuards,
  Version,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../auth/jwt.service';
import {
  Roles,
  RolesGuard,
} from '../auth/guards/role.guards';

import { AdminService } from './admin.service';

class RejectWorkerDto {
  reason!: string;
}

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  'SUPER_ADMIN',
  'ADMIN',
  'OPERATIONS',
)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
  ) {}

  @Get('workers/kyc')
  @Version('1')
  getPendingWorkerKyc() {
    return this.adminService.getPendingWorkerKyc();
  }

  @Patch('workers/:workerId/kyc/review')
  @Version('1')
  startWorkerKycReview(
    @Req() request: AuthenticatedRequest,
    @Param('workerId') workerId: string,
  ) {
    return this.adminService.startWorkerKycReview(
      workerId,
      request.user.sub,
    );
  }

  @Patch('workers/:workerId/kyc/approve')
  @Version('1')
  approveWorkerKyc(
    @Req() request: AuthenticatedRequest,
    @Param('workerId') workerId: string,
  ) {
    return this.adminService.approveWorkerKyc(
      workerId,
      request.user.sub,
    );
  }

  @Patch('workers/:workerId/kyc/reject')
  @Version('1')
  rejectWorkerKyc(
    @Req() request: AuthenticatedRequest,
    @Param('workerId') workerId: string,
    @Body() dto: RejectWorkerDto,
  ) {
    return this.adminService.rejectWorkerKyc(
      workerId,
      request.user.sub,
      dto.reason,
    );
  }

  @Get('workers/:workerId/kyc/aadhaar')
  @Version('1')
  async getAadhaarDocument(
    @Param('workerId') workerId: string,
  ) {
    const document =
      await this.adminService.getWorkerKycDocument(
        workerId,
        'aadhaar',
      );

    return new StreamableFile(document.buffer, {
      type: 'application/octet-stream',
      disposition: `inline; filename="${workerId}-aadhaar"`,
    });
  }

  @Get(
    'workers/:workerId/kyc/police-verification',
  )
  @Version('1')
  async getPoliceVerificationDocument(
    @Param('workerId') workerId: string,
  ) {
    const document =
      await this.adminService.getWorkerKycDocument(
        workerId,
        'police-verification',
      );

    return new StreamableFile(document.buffer, {
      type: 'application/octet-stream',
      disposition: `inline; filename="${workerId}-police-verification"`,
    });
  }
}