import {Module} from '@nestjs/common';

import {AuthModule} from '../auth/auth.module';
import {PrismaModule} from '../common/prisma/prisma.module';
import {RealtimeModule} from '../realtime/realtime.module';

import {RequirementsController} from './requirements.controller';
import {RequirementsService} from './requirements.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RealtimeModule,
  ],
  controllers: [
    RequirementsController,
  ],
  providers: [
    RequirementsService,
  ],
  exports: [
    RequirementsService,
  ],
})
export class RequirementsModule {}
