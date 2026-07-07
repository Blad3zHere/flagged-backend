import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { readFileSync, existsSync } from 'fs';

async function bootstrap() {
  let httpsOptions = undefined;

  //Only load SSL certificates if they are configured and the files actually exist (useful for testing)
  if (
    process.env.SSL_KEY &&
    process.env.SSL_CERT &&
    existsSync(process.env.SSL_KEY) &&
    existsSync(process.env.SSL_CERT)
  ) {
    try {
      httpsOptions = {
        key: readFileSync(process.env.SSL_KEY),
        cert: readFileSync(process.env.SSL_CERT),
      };
      Logger.log('SSL key and cert loaded successfully');
    } catch (error) {
      Logger.error('Failed to read SSL key or cert:', error);
    }
  } else {
    Logger.log('SSL key and cert not provided. Falling back to HTTP.');
  }

  const app = await NestFactory.create(AppModule, {
    httpsOptions,
    logger: ['log', 'error', 'warn', 'debug', 'verbose'], // Enable all log levels
  });

  // Log HTTPS options to confirm they are being used
  //Logger.log('HTTPS options:', httpsOptions);

  // Configure CORS
  app.enableCors({
    origin: 'https://flagged-app.com',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.setGlobalPrefix('api'); // Prefix all routes with /api

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, '0.0.0.0');

  Logger.log('Application is running on: ' + (await app.getUrl()));
}

bootstrap();
