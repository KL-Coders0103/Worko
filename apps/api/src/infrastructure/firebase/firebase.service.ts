import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app?: App;
  private messaging?: Messaging;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('FIREBASE_ENABLED', false)) {
      this.logger.log('Firebase Cloud Messaging is disabled.');
      return;
    }

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase is enabled but server credentials are incomplete.');
      return;
    }

    this.app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });

    this.messaging = getMessaging(this.app);
    this.logger.log(`Firebase Cloud Messaging initialized for project ${projectId}.`);
  }

  isEnabled(): boolean {
    return Boolean(this.messaging);
  }

  async sendToToken(
    token: string,
    title: string,
    body: string,
    data: Record<string, string> = {},
  ): Promise<string> {
    if (!this.messaging) throw new Error('FIREBASE_DISABLED');

    return this.messaging.send({
      token,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: {
          channelId: 'worko_default',
        },
      },
    });
  }

  isInvalidTokenError(error: unknown): boolean {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : '';
    const message = error instanceof Error ? error.message : String(error);

    return (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-argument' ||
      /registration token is not a valid FCM registration token/i.test(message)
    );
  }
}
