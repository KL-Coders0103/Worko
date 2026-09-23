import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';

export type OtpChannel = 'EMAIL' | 'SMS';

@Injectable()
export class OtpDeliveryService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  async sendOtp(params: {
    channel: OtpChannel;
    destination: string;
    otp: string;
    purpose: string;
  }): Promise<void> {
    if (params.channel === 'EMAIL') {
      await this.sendEmail(params);
      return;
    }

    await this.sendDevelopmentSms(params);
  }

  private async sendEmail(params: {
    destination: string;
    otp: string;
    purpose: string;
  }): Promise<void> {
    const apiKey =
      this.configService.get<string>(
        'RESEND_API_KEY',
      );

    const fromEmail =
      this.configService.get<string>(
        'RESEND_FROM_EMAIL',
      );

    if (!apiKey || !fromEmail) {
      throw new InternalServerErrorException(
        'Email OTP service is not configured',
      );
    }

    const response = await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          from: fromEmail,
          to: [params.destination],
          subject: 'Your Worko verification code',
          html: this.buildEmailHtml(
            params.otp,
            params.purpose,
          ),
        }),
      },
    );

    if (!response.ok) {
      const errorBody = await response.text();

      console.error(
        '[OTP EMAIL ERROR]',
        response.status,
        errorBody,
      );

      throw new InternalServerErrorException(
        'Unable to send OTP email',
      );
    }
  }

  private async sendDevelopmentSms(params: {
    destination: string;
    otp: string;
    purpose: string;
  }): Promise<void> {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV');

    if (nodeEnv === 'production') {
      throw new InternalServerErrorException(
        'SMS OTP provider is not configured',
      );
    }

    console.log('');
    console.log('========================================');
    console.log('[DEV MOBILE OTP]');
    console.log(`Mobile: ${params.destination}`);
    console.log(`OTP: ${params.otp}`);
    console.log(`Purpose: ${params.purpose}`);
    console.log('Expires in: 5 minutes');
    console.log('========================================');
    console.log('');
  }

  private buildEmailHtml(
    otp: string,
    purpose: string,
  ): string {
    const purposeText =
      purpose === 'REGISTRATION'
        ? 'complete your Worko registration'
        : 'log in to your Worko account';

    return `
      <!DOCTYPE html>
      <html>
        <body style="
          font-family: Arial, sans-serif;
          background:#f5f5f5;
          padding:30px;
        ">
          <div style="
            max-width:500px;
            margin:auto;
            background:white;
            padding:30px;
            border-radius:12px;
          ">
            <h2 style="color:#FF6B00;">
              WORKO
            </h2>

            <p>
              Use the verification code below to
              ${purposeText}.
            </p>

            <div style="
              font-size:32px;
              font-weight:bold;
              letter-spacing:8px;
              padding:20px;
              text-align:center;
              background:#f7f7f7;
              border-radius:8px;
              margin:20px 0;
            ">
              ${otp}
            </div>

            <p>
              This code expires in
              <strong>5 minutes</strong>.
            </p>

            <p style="color:#777;">
              If you did not request this code,
              you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}