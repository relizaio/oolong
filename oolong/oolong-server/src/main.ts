import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Set global API prefix from environment variable, default to v0.2.0-beta.2
  // Exclude .well-known paths from the prefix
  const apiVersion = process.env.API_VERSION || 'v0.2.0-beta.2';
  app.setGlobalPrefix(apiVersion, {
    exclude: ['.well-known/tea']
  });
  
  console.log(`API endpoints prefixed with: /${apiVersion}`);
  console.log('Excluded from prefix: /.well-known/tea');
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
