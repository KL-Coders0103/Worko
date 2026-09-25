import {Module} from '@nestjs/common';

import {AuthModule} from '../auth/auth.module';
import {PrismaModule} from '../common/prisma/prisma.module';

import {RealtimeGateway} from './realtime.gateway';

@Module({
  imports: [
    AuthModule,
    PrismaModule,
  ],
  providers: [
    RealtimeGateway,
  ],
  exports: [
    RealtimeGateway,
  ],
})
export class RealtimeModule {}
