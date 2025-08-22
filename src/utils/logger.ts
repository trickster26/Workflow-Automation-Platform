import winston from 'winston';
import path from 'path';
import config from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    return logMessage;
  })
);

const createLogger = (module: string = 'App') => {
  const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    defaultMeta: { module },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        ),
      }),
    ],
  });

  if (config.nodeEnv === 'production') {
    const logDir = path.dirname(config.logging.file);
    
    logger.add(new winston.transports.File({
      filename: config.logging.file,
      level: 'info',
    }));
    
    logger.add(new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }));
  }

  return logger;
};

export { createLogger };
export default createLogger('App');