import pino from 'pino';
import pinoPretty from 'pino-pretty';

const isDevelopment = process.env.NODE_ENV !== 'production';

const prettyStream = isDevelopment
  ? pinoPretty({
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
    })
  : undefined;

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
}, prettyStream);

// Helper pour créer des loggers avec contexte
export function createLogger(context: string) {
  return logger.child({ context });
}

// Types pour logger avec contexte
export type Logger = typeof logger;
