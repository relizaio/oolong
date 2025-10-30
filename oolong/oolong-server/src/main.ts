import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { logger } from './utils/logger';

async function bootstrap() {
  const isDebugMode = process.env.DEBUG_MODE === 'true';
  
  // Configure NestJS logger based on debug mode
  const app = await NestFactory.create(AppModule, {
    logger: isDebugMode ? ['log', 'error', 'warn', 'debug', 'verbose'] : ['error', 'warn']
  });
  
  // Set global API prefix from environment variable, default to v0.2.0-beta.2
  // Exclude .well-known paths from the prefix
  const apiVersion = process.env.API_VERSION || 'v0.2.0-beta.2';
  app.setGlobalPrefix(apiVersion, {
    exclude: ['.well-known/tea']
  });
  
  logger.log(`API endpoints prefixed with: /${apiVersion}`);
  logger.debug('Excluded from prefix: /.well-known/tea');
  logger.debug(`Debug mode: ${isDebugMode ? 'enabled' : 'disabled'}`);
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
