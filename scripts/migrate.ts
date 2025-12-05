import dotenv from 'dotenv';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = fileURLToPath(new URL('.', import.meta.url));

dotenv.config({ path: join(__dirname, '..', '.env') });

const MIGRATIONS_DIR = join(__dirname, '..', 'db', 'migrations');

async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔍 Buscando archivos de migración...');

    // Leer archivos SQL del directorio
    const files = await readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort(); // Orden alfabético/numérico

    if (sqlFiles.length === 0) {
      console.log('⚠️  No se encontraron archivos SQL en', MIGRATIONS_DIR);
      return;
    }

    console.log(`📋 Encontrados ${sqlFiles.length} archivo(s) de migración:`);
    sqlFiles.forEach((file) => console.log(`   - ${file}`));

    // Ejecutar cada archivo en orden
    for (const file of sqlFiles) {
      const filePath = join(MIGRATIONS_DIR, file);
      console.log(`\n🚀 Ejecutando: ${file}...`);

      const sql = await readFile(filePath, 'utf-8');

      await pool.query(sql);

      console.log(`✅ ${file} ejecutado exitosamente`);
    }

    console.log('\n✨ Todas las migraciones completadas exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
