const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env');
const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const target = (process.argv[2] || '').toLowerCase().trim();

if (!['sqlite', 'postgres', 'postgresql', 'status'].includes(target)) {
  console.log(`
Usage:
  node scripts/switch-db.js sqlite    # Switch local dev & testing to SQLite
  node scripts/switch-db.js postgres  # Switch to external PostgreSQL (Neon/prod)
  node scripts/switch-db.js status    # Show current active database configuration
`);
  process.exit(0);
}

if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found at:', envPath);
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');

// Parse current .env
const envMap = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...rest] = trimmed.split('=');
    envMap[key.trim()] = rest.join('=').replace(/^["']|["']$/g, '').trim();
  }
}

// Check current status
const currentUrl = envMap.DATABASE_URL || '';
const currentIsSqlite = currentUrl.startsWith('file:') || currentUrl.includes('.db');

if (target === 'status') {
  console.log('--------------------------------------------------');
  console.log(`Current DB Mode: ${currentIsSqlite ? '🟢 SQLite (Local File)' : '🔵 PostgreSQL (Remote / External)'}`);
  console.log(`DATABASE_URL:    ${currentUrl}`);
  console.log('--------------------------------------------------');
  process.exit(0);
}

const postgresDatasource = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`;

const sqliteDatasource = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;

const datasourceRegex = /datasource\s+db\s*\{[\s\S]*?\}/;

if (target === 'sqlite') {
  console.log('🔄 Switching to SQLite for local development & testing...');

  // Preserve postgres URLs if present
  if (currentUrl.startsWith('postgresql://') || currentUrl.startsWith('postgres://')) {
    envMap.POSTGRES_DATABASE_URL = currentUrl;
    if (envMap.DIRECT_URL) {
      envMap.POSTGRES_DIRECT_URL = envMap.DIRECT_URL;
    }
  }

  // Update DATABASE_URL to sqlite
  envMap.DATABASE_URL = 'file:./dev.db';

  // Write updated .env
  let newEnv = '';
  for (const [k, v] of Object.entries(envMap)) {
    newEnv += `${k}="${v}"\n`;
  }
  fs.writeFileSync(envPath, newEnv.trim() + '\n', 'utf8');

  // Update schema.prisma
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  schemaContent = schemaContent.replace(datasourceRegex, sqliteDatasource);
  fs.writeFileSync(schemaPath, schemaContent, 'utf8');

  // Generate client and push schema to dev.db
  console.log('📦 Generating Prisma Client for SQLite...');
  execSync('npx prisma generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('🗄️  Syncing schema to local SQLite database (dev.db)...');
  execSync('npx prisma db push --accept-data-loss', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('\n✅ Successfully switched to SQLite!');
  console.log('• Local DB: backend/prisma/dev.db');
  console.log('• External PostgreSQL database will NOT be touched by local tests or development.');
} else {
  console.log('🔄 Switching to PostgreSQL (external / Neon)...');

  const pgUrl = envMap.POSTGRES_DATABASE_URL || (currentUrl.startsWith('postgres') ? currentUrl : null);
  if (!pgUrl) {
    console.error('❌ No POSTGRES_DATABASE_URL found in .env to restore.');
    process.exit(1);
  }

  envMap.DATABASE_URL = pgUrl;
  if (envMap.POSTGRES_DIRECT_URL) {
    envMap.DIRECT_URL = envMap.POSTGRES_DIRECT_URL;
  }

  // Write updated .env
  let newEnv = '';
  for (const [k, v] of Object.entries(envMap)) {
    newEnv += `${k}="${v}"\n`;
  }
  fs.writeFileSync(envPath, newEnv.trim() + '\n', 'utf8');

  // Update schema.prisma
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  schemaContent = schemaContent.replace(datasourceRegex, postgresDatasource);
  fs.writeFileSync(schemaPath, schemaContent, 'utf8');

  // Generate client
  console.log('📦 Generating Prisma Client for PostgreSQL...');
  execSync('npx prisma generate', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });

  console.log('\n✅ Successfully switched to PostgreSQL!');
  console.log(`• Connected to: ${pgUrl.split('@')[1] || 'remote database'}`);
}
