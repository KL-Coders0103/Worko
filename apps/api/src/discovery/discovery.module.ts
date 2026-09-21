import { Module } from '@nestjs/common';

import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';

import { PrismaModule } from '../common/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    DiscoveryController,
  ],
  providers: [
    DiscoveryService,
  ],
  exports: [
    DiscoveryService,
  ],
})
export class DiscoveryModule {}