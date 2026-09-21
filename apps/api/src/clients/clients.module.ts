import {Module} from '@nestjs/common';

import {ClientsController} from './clients.controller';
import {ClientsService} from './client.service';

import {PrismaModule} from '../common/prisma/prisma.module';
import {AuthModule} from '../auth/auth.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [
    ClientsController,
  ],
  providers: [
    ClientsService,
  ],
  exports: [
    ClientsService,
  ],
})
export class ClientsModule {}