/**
 * Setup global para tests E2E
 * IMPORTANTE: Este archivo se ejecuta ANTES de cargar cualquier módulo
 * Configura variables de entorno para usar PostgreSQL real
 */

// Configurar variables de entorno ANTES de cualquier import
process.env.DATABASE_URL = 'postgresql://orders_user:orders_pass@localhost:5432/orders_db';
process.env.USE_INMEMORY = 'false'; // IMPORTANTE: Usar PostgreSQL real
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Silenciar logs en tests

console.log('🔧 E2E Test Environment:');
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL}`);
console.log(`   USE_INMEMORY: ${process.env.USE_INMEMORY}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
