import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // CORS: localhost + orígenes extra desde env (ej. ngrok para probar desde URL pública)
  const corsOrigins: string[] = ['http://localhost:3000'];
  const extraOrigins = process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  app.enableCors({
    origin: [...corsOrigins, ...extraOrigins],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
  // Docs: http://localhost:3001/api/docs
  // JSON: http://localhost:3001/api/docs-json

  await app.listen(3001);
}

void bootstrap();
