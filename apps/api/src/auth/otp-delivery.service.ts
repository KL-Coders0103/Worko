import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);

  constructor(private readonly config: ConfigService) {}

  async deliver(destination: string, code: string): Promise<void> {
    const environment = this.config.get<string>('NODE_ENV', 'development');

    if (environment !== 'development' && environment !== 'test') {
      throw new InternalServerErrorException(
        'OTP delivery provider is not configured',
      );
    }

    this.logger.warn(
      `[DEV ONLY] OTP for ${destination}: ${code}`,
    );
  }
}