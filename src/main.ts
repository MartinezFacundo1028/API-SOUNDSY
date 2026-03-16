import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CORS: en desarrollo permite cualquier origen; en producción usa CORS_ORIGINS
  const isProd = process.env.NODE_ENV === 'production';
  const prodOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  app.enableCors({
    origin: isProd && prodOrigins.length > 0 ? prodOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning'],
  });

  // Prefijo + versionado
  app.setGlobalPrefix('api'); // /api/*
  app.enableVersioning({
    type: VersioningType.URI, // /api/v1/*
    defaultVersion: '1',
  });

  // Validaciones globales
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (inline para evitar lints no-unsafe-*)
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Soundsy API')
      .setDescription('Marketplace de servicios musicales')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);
  // Docs: http://localhost:${process.env.PORT}/api/docs
  // JSON: http://localhost:${process.env.PORT}/api/docs-json

  await app.listen(Number(process.env.PORT) || 3001);
}

void bootstrap();
