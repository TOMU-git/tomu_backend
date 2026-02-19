import { HttpAdapterHost, NestFactory, ModuleRef } from "@nestjs/core";
import { AppModule } from "./app.module";
import { config } from "./common/config/index";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AllExceptionsFilter } from "./lib/AllExceptionFilters";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as crypto from 'crypto';

// global crypto qilib qo'yamiz
if (!globalThis.crypto) {
  (globalThis as any).crypto = crypto;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  });
  const httpAdapterHost = app.get(HttpAdapterHost);
  const moduleRef = app.get(ModuleRef);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost, moduleRef));

  app.setGlobalPrefix("api");

  // ✅ Static assets serving - /public papkani serve qilish
  app.useStaticAssets('public', {
    prefix: '/public',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const options = new DocumentBuilder()
      .setTitle("LMS API Documentation")
      .setDescription("Description")
      .setVersion("1.0.0")
      .addTag("apies")
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, options);
    SwaggerModule.setup("docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true, // Avtorizatsiyani saqlab qoladi
      },
    });
  }

  await app.listen(config.port, () => {
    console.log(`http://localhost:${config.port}`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`http://localhost:${config.port}/docs`);
    }
  });
}
bootstrap();
