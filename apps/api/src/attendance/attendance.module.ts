import { Module } from '@nestjs/common';

import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StorageModule,
    RealtimeModule,
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