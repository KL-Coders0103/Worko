import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MatchingModule } from '../matching/matching.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AuthModule, MatchingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
