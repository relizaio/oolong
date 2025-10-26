import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix from environment variable, default to v0.2.0-beta.2
  const apiVersion = process.env.API_VERSION || 'v0.2.0-beta.2';
  app.setGlobalPrefix(apiVersion);
  
  console.log(`API endpoints prefixed with: /${apiVersion}`);
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
