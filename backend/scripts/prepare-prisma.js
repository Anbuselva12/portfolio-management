const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      const val = rest.join('=').replace(/^["']|["']$/g, '').trim();
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = val;
      }
    }
  }
}

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('[prepare-prisma] schema.prisma not found at:', schemaPath);
  process.exit(1);
}

let content = fs.readFileSync(schemaPath, 'utf8');

// Determine target database provider:
// If running on Vercel OR DATABASE_URL begins with postgresql:// or postgres://, use postgresql
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = isVercel || dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');

const postgresDatasource = `datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}`;

const sqliteDatasource = `datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}`;

const targetDatasource = isPostgres ? postgresDatasource : sqliteDatasource;
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

const datasourceRegex = /datasource\s+db\s*\{[\s\S]*?\}/;

if (datasourceRegex.test(content)) {
  const currentDatasource = content.match(datasourceRegex)[0];
  const isAlreadyPostgres = isPostgres && currentDatasource.includes('provider') && currentDatasource.includes('postgresql');
  const isAlreadySqlite = !isPostgres && currentDatasource.includes('provider') && currentDatasource.includes('sqlite');

  if (isAlreadyPostgres || isAlreadySqlite) {
    console.log(`[prepare-prisma] schema.prisma already set to provider: ${targetProvider}`);
  } else {
    content = content.replace(datasourceRegex, targetDatasource);
    fs.writeFileSync(schemaPath, content, 'utf8');
    console.log(`[prepare-prisma] Automatically set schema.prisma provider to: ${targetProvider}`);
  }
} else {
  console.error('[prepare-prisma] Could not find datasource block in schema.prisma');
}
