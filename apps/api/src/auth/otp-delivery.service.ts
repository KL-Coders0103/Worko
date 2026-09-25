import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export type OtpChannel = 'EMAIL' | 'SMS';

@Injectable()
export class OtpDeliveryService {
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
  ) {
    // Configure Nodemailer to use your free Gmail account
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'lovesh.m.bodhani@gmail.com', 
        pass: 'gpalqsxjhtcgcshy', 
      },
      family: 4,
    } as any);
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
      await this.transporter.sendMail({
        from: '"WORKO" <lovesh.m.bodhani@gmail.com>',
        to: params.destination, // This will now send to ANY email address!
        subject: 'Your Worko verification code',
        html: this.buildEmailHtml(
          params.otp,
          params.purpose,
        ),
      });

      console.log(`[SUCCESS] Email OTP sent to ${params.destination}`);
    } catch (error) {
      console.error('[OTP EMAIL ERROR]', error);
      throw new InternalServerErrorException(
        'Unable to send OTP email. Please check your Gmail App Password.',
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