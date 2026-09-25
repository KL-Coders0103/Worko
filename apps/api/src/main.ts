import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { RequestHandler } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new HttpExceptionFilter());

  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');

  const securityHeaders: RequestHandler = (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );

    if (configService.get<string>('app.nodeEnv') === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    next();
  };

  expressApp.use(securityHeaders);

  const corsOrigins =
    configService.get<string[]>('app.corsOrigins') ?? [];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  });

  const trustProxy =
    configService.get<boolean>('app.trustProxy') ?? false;

  if (trustProxy) {
    app
      .getHttpAdapter()
      .getInstance()
      .set('trust proxy', true);
  }

  app.setGlobalPrefix(
    configService.get<string>('app.apiPrefix') ?? 'api',
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.enableShutdownHooks();

  const swaggerEnabled =
    configService.get<boolean>('app.swaggerEnabled') ?? false;

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Worko API')
      .setDescription(
        'Worko workforce marketplace API',
      )
      .setVersion('1.0')
      .build();

    const swaggerDocument = SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );

    SwaggerModule.setup(
      'docs',
      app,
      swaggerDocument,
    );
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port =
    configService.get<number>('app.port') ?? 3000;

  await app.listen(port, '0.0.0.0');
}

void bootstrap();
