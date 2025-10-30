/**
 * Logger utility using NestJS built-in Logger
 * Respects DEBUG_MODE environment variable for log levels
 */

import { Logger } from '@nestjs/common';

// Create a logger instance for the application
const appLogger = new Logger('OolongApp');

export const logger = {
  debug: (message: any, ...optionalParams: any[]) => {
    appLogger.debug(message, ...optionalParams);
  },
  
  log: (message: any, ...optionalParams: any[]) => {
    appLogger.log(message, ...optionalParams);
  },
  
  warn: (message: any, ...optionalParams: any[]) => {
    appLogger.warn(message, ...optionalParams);
  },
  
  error: (message: any, ...optionalParams: any[]) => {
    appLogger.error(message, ...optionalParams);
  },
  
  verbose: (message: any, ...optionalParams: any[]) => {
    appLogger.verbose(message, ...optionalParams);
  }
};
