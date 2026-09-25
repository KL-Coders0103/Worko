import {Module} from '@nestjs/common';

import {DemoPaymentProvider} from './demo-payment.provider';
import {PAYMENT_PROVIDER} from '../payment-provider.token';

@Module({
  providers: [
    DemoPaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: DemoPaymentProvider,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentProvidersModule {}
