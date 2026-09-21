import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../auth/jwt.service';

import {
  CreateWorkerProfileDto,
  UpdateWorkerCategoriesDto,
  UpdateWorkerKycDocumentsDto,
  UpdateWorkerLocationDto,
  UpdateWorkerProfileDto,
  UpdateWorkerSkillsDto,
} from './dto/worker.dto';

import { WorkersService } from './workers.service';

type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};

@Controller('workers')
@UseGuards(JwtAuthGuard)
export class WorkersController {
  constructor(
    private readonly workersService: WorkersService,
  ) {}

  @Get('me')
  @Version('1')
  getMyProfile(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workersService.getMyProfile(
      request.user.sub,
    );
  }

  @Post('me')
  @Version('1')
  createProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateWorkerProfileDto,
  ) {
    return this.workersService.createProfile(
      request.user.sub,
      dto,
    );
  }

  @Patch('me')
  @Version('1')
  updateProfile(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWorkerProfileDto,
  ) {
    return this.workersService.updateProfile(
      request.user.sub,
      dto,
    );
  }

  @Patch('me/categories')
  @Version('1')
  updateCategories(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWorkerCategoriesDto,
  ) {
    return this.workersService.updateCategories(
      request.user.sub,
      dto,
    );
  }

  @Patch('me/skills')
  @Version('1')
  updateSkills(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWorkerSkillsDto,
  ) {
    return this.workersService.updateSkills(
      request.user.sub,
      dto,
    );
  }

  @Patch('me/location')
  @Version('1')
  updateLocation(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWorkerLocationDto,
  ) {
    return this.workersService.updateLocation(
      request.user.sub,
      dto,
    );
  }

  @Post('me/submit')
  @Version('1')
  submitForKyc(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.workersService.submitForKyc(
      request.user.sub,
    );
  }

  @Post('me/kyc')
  @Version('1')
  submitKycDocuments(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateWorkerKycDocumentsDto,
  ) {
    return this.workersService.submitKycDocuments(
      request.user.sub,
      dto,
    );
  }

  @Post('me/profile-photo')
@Version('1')
@UseInterceptors(
  FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (
      _request,
      file,
      callback,
    ) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            'Only JPG, PNG, and WEBP images are allowed',
          ),
          false,
        );
      }

      callback(null, true);
    },
  }),
)
uploadProfilePhoto(
  @Req() request: AuthenticatedRequest,
  @UploadedFile()
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
  },
) {
  if (!file) {
    throw new BadRequestException(
      'Profile photo is required',
    );
  }

  return this.workersService.uploadProfilePhoto(
    request.user.sub,
    file,
  );
}

  @Post('me/kyc/aadhaar')
  @Version('1')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'application/pdf',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only PDF, JPG, and PNG files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadAadhaar(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    }
  ) {
    if (!file) {
      throw new BadRequestException(
        'Aadhaar document is required',
      );
    }

    return this.workersService.uploadAadhaarDocument(
      request.user.sub,
      file,
    );
  }

  @Post('me/kyc/police-verification')
  @Version('1')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'application/pdf',
        ];

        if (!allowedTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              'Only PDF, JPG, and PNG files are allowed',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  uploadPoliceVerification(
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: {
      buffer: Buffer;
      mimetype: string;
      originalname: string;
      size: number;
    }
  ) {
    if (!file) {
      throw new BadRequestException(
        'Police verification document is required',
      );
    }

    return this.workersService.uploadPoliceVerificationDocument(
      request.user.sub,
      file,
    );
  }
}