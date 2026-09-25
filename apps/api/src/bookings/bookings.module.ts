import {Module} from '@nestjs/common';

import {BookingsController} from './bookings.controller';
import {BookingsService} from './bookings.service';

import {PrismaModule} from '../common/prisma/prisma.module';
import {AuthModule} from '../auth/auth.module';
import {RealtimeModule} from '../realtime/realtime.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    RealtimeModule,
  ],
  controllers: [
    BookingsController,
  ],
  providers: [
    BookingsService,
  ],
  exports: [
    BookingsService,
  ],
})
export class BookingsModule {}