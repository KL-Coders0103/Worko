import { Module } from '@nestjs/common';

import { PrismaModule } from '../common/prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

import { ReelsController } from './reels.controller';
import { ReelsService } from './reels.service';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    AuthModule,
  ],
  controllers: [
    ReelsController,
  ],
  providers: [
    ReelsService,
  ],
  exports: [
    ReelsService,
  ],
})
export class ReelsModule {}