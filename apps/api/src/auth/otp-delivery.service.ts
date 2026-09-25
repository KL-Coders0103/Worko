import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';

export type OtpChannel = 'EMAIL' | 'SMS';

@Injectable()
export class OtpDeliveryService {
  private readonly gmail;

  private readonly senderEmail: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    const clientId =
      this.configService.get<string>(
        'GOOGLE_CLIENT_ID',
      );

    const clientSecret =
      this.configService.get<string>(
        'GOOGLE_CLIENT_SECRET',
      );

    const refreshToken =
      this.configService.get<string>(
        'GOOGLE_REFRESH_TOKEN',
      );

    this.senderEmail =
      this.configService.get<string>(
        'GOOGLE_EMAIL',
      ) || '';

    if (
      !clientId ||
      !clientSecret ||
      !refreshToken ||
      !this.senderEmail
    ) {
      throw new Error(
        'Google Gmail environment variables are not configured',
      );
    }

    const oauth2Client =
      new google.auth.OAuth2(
        clientId,
        clientSecret,
        'http://localhost:3000/oauth2callback',
      );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({
      version: 'v1',
      auth: oauth2Client,
    });
  }

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
    try {
      const purposeText =
        params.purpose === 'REGISTRATION'
          ? 'complete your Worko registration'
          : 'log in to your Worko account';

      const html = this.buildEmailHtml(
        params.otp,
        params.purpose,
      );

      const plainText = `
Your Worko verification code is: ${params.otp}

Use this code to ${purposeText}.

This code expires in 5 minutes.

If you did not request this code, you can safely ignore this email.
      `.trim();

      const message = [
        `From: "WORKO" <${this.senderEmail}>`,
        `To: ${params.destination}`,
        'Subject: Your Worko verification code',
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="WORKO_BOUNDARY"',
        '',
        '--WORKO_BOUNDARY',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        plainText,
        '',
        '--WORKO_BOUNDARY',
        'Content-Type: text/html; charset="UTF-8"',
        '',
        html,
        '',
        '--WORKO_BOUNDARY--',
      ].join('\r\n');

      const encodedMessage =
        Buffer.from(message)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

      const response =
        await this.gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });

      console.log('');
      console.log('========================================');
      console.log('[SUCCESS] Email OTP sent');
      console.log(
        `Destination: ${params.destination}`,
      );
      console.log(
        `Message ID: ${response.data.id}`,
      );
      console.log(
        `Purpose: ${params.purpose}`,
      );
      console.log('========================================');
      console.log('');
    } catch (error: unknown) {
      console.error(
        '[GMAIL API ERROR]',
        error instanceof Error ? error.message : error,
      );

      throw new InternalServerErrorException(
        'Unable to send OTP email. Please try again.',
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
        <body
          style="
            margin:0;
            padding:30px;
            font-family:Arial,sans-serif;
            background:#f5f5f5;
          "
        >
          <div
            style="
              max-width:500px;
              margin:auto;
              background:#ffffff;
              padding:30px;
              border-radius:12px;
            "
          >
            <h2 style="color:#FF6B00;">
              WORKO
            </h2>

            <p>
              Use the verification code below to
              ${purposeText}.
            </p>

            <div
              style="
                font-size:32px;
                font-weight:bold;
                letter-spacing:8px;
                padding:20px;
                text-align:center;
                background:#f7f7f7;
                border-radius:8px;
                margin:20px 0;
              "
            >
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
