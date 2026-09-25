import {
  BadRequestException,
  Body,
  ParseFilePipeBuilder,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';

import { AttendanceService } from './attendance.service';

import {
  AttendanceQrPurposeDto,
  ValidateAttendanceQrDto,
} from './dto/attendance-qr.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  Roles,
  RolesGuard,
} from '../auth/guards/role.guards';

import type { Request } from 'express';
import type { AccessTokenPayload } from '../auth/jwt.service';
import { AttendanceActionDto } from './dto/attendance-action.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { AttendanceEvidenceDto } from './dto/attendance-evidence.dto';

type AuthenticatedRequest =
  Request & {
    user: AccessTokenPayload;
  };

@Controller({
  path: 'attendance',
})
@UseGuards(
  JwtAuthGuard,
  RolesGuard,
)
export class AttendanceController {
  constructor(
    private readonly attendanceService: AttendanceService,
  ) {}

  /**
   * Client displays this QR.
   */
  @Post(':bookingId/qr')
  @Version('1')
  @Roles('CLIENT')
  createQrToken(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() dto: AttendanceQrPurposeDto,
  ) {
    return this.attendanceService.createQrToken(
      req.user.sub,
      bookingId,
      dto.purpose,
    );
  }

  /**
   * Worker scans customer QR.
   *
   * This endpoint validates the booking-specific
   * QR without consuming it.
   *
   * The state-changing check-in/check-out
   * endpoints consume the token atomically
   * with the attendance transition.
   */
  @Post(':bookingId/qr/validate')
  @Version('1')
  @Roles('WORKER')
  validateQrToken(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() dto: ValidateAttendanceQrDto,
  ) {
    return this.attendanceService.validateQrToken(
      req.user.sub,
      bookingId,
      dto.token,
      dto.purpose,
    );
  }

  @Get(':bookingId/evidence')
  @Version('1')
  @Roles('CLIENT', 'WORKER')
  getAttendanceEvidence(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
  ) {
    return this.attendanceService.getAttendanceEvidence(
      req.user.sub,
      bookingId,
    );
  }

  @Post(':bookingId/check-in')
  @Version('1')
  @Roles('WORKER')
  checkIn(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() dto: AttendanceActionDto,
  ) {
    return this.attendanceService.checkIn(
      req.user.sub,
      bookingId,
      dto,
    );
  }

  @Post(':bookingId/check-out')
  @Version('1')
  @Roles('WORKER')
  checkOut(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() dto: AttendanceActionDto,
  ) {
    return this.attendanceService.checkOut(
      req.user.sub,
      bookingId,
      dto,
    );
  }

  @Post(':bookingId/evidence/upload')
  @Version('1')
  @Roles('WORKER')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadEvidence(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /^(jpeg|png|webp)$/i,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024,
        })
        .build(),
    )
    file?: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('Evidence image is required');
    }

    return this.attendanceService.uploadAttendanceEvidence(
      req.user.sub,
      bookingId,
      file.buffer,
      file.mimetype,
      file.originalname,
    );
  }

  @Post(':bookingId/evidence')
  @Version('1')
  @Roles('WORKER')
  async createEvidence(
    @Req() req: AuthenticatedRequest,
    @Param('bookingId') bookingId: string,
    @Body() dto: AttendanceEvidenceDto,
  ) {
    return this.attendanceService.createAttendanceEvidence(
      req.user.sub,
      bookingId,
      dto,
    );
  }
}