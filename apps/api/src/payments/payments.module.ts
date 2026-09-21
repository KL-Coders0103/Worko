import {Module} from '@nestjs/common';

import {PaymentsController} from './payments.controller';
import {PaymentsService} from './payments.service';

import {PrismaModule} from '../common/prisma/prisma.module';
import {AuthModule} from '../auth/auth.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    WalletModule
  ],
  controllers: [
    PaymentsController,
  ],
  providers: [
    PaymentsService,
  ],
  exports: [
    PaymentsService,
  ],
})
export class PaymentsModule {}