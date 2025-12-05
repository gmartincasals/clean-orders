import dotenv from 'dotenv';
import { LoggerFactory } from '../logging/PinoLogger.js';
import { OutboxDispatcher } from './OutboxDispatcher.js';

dotenv.config();

/**
 * Worker principal para procesar eventos del outbox
 */
async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Crear logger
  const logger = LoggerFactory.create({
    prettyPrint: process.env.NODE_ENV !== 'production',
    name: 'outbox-dispatcher',
  });

  const dispatcher = new OutboxDispatcher({
    connectionString,
    batchSize: parseInt(process.env.OUTBOX_BATCH_SIZE || '10', 10),
    pollIntervalMs: parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '5000', 10),
    logger,
  });

  // Manejo de señales de terminación
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await dispatcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await dispatcher.stop();
    process.exit(0);
  });

  // Mostrar estadísticas iniciales
  const stats = await dispatcher.getStats();
  logger.info('Initial outbox statistics', {
    pending: stats.pendingEvents,
    published: stats.publishedEvents,
    oldestPending: stats.oldestPendingEvent,
  });

  // Iniciar el dispatcher
  await dispatcher.start();
}

main().catch((error) => {
  console.error('Fatal error in outbox dispatcher:', error);
  process.exit(1);
});
