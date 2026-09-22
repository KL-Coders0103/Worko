import { Module } from '@nestjs/common';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StorageModule,
  ],
  controllers: [
    AttendanceController,
  ],
  providers: [
    AttendanceService,
  ],
  exports: [
    AttendanceService,
  ],
})
export class AttendanceModule {}