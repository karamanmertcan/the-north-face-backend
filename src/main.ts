import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './filters/exception.filter';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Static dosyalar için uploads klasörünü serve et
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/', // URL'de /thumbnails şeklinde erişilebilir
  });

  await app.listen(3000);

  const config = app.get<ConfigService>(ConfigService);


  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(config));
}
bootstrap();
