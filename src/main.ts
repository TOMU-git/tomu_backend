import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './common/config/index';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AllExceptionsFilter } from './lib/AllExceptionFilters';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: true, // Allows all domains
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const options = new DocumentBuilder()
    .setTitle('LMS API Documentation')
    .setDescription('Description')
    .setVersion('1.0.0')
    .addTag('apies')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Avtorizatsiyani saqlab qoladi
    },
  });


  await app.listen(config.port, () => {
    console.log(`http://localhost:${config.port}`);
    console.log(`http://localhost:${config.port}/docs`);
  });
}
bootstrap();
