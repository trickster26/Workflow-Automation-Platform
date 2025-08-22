#!/usr/bin/env node

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function resetDatabase() {
  const dbName = process.env.DB_NAME || 'workflow_automation';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;

  // Connect to PostgreSQL server (without specifying database)
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres', // Connect to default postgres database
  });

  try {
    console.log('🔄 Connecting to PostgreSQL server...');
    await client.connect();

    console.log('⚠️  Dropping database if it exists...');
    
    // Terminate existing connections to the database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
    `, [dbName]);

    // Drop database if it exists
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    console.log(`✅ Database "${dbName}" dropped`);

    // Create database
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`✅ Database "${dbName}" created`);

    await client.end();
    
    // Connect to the target database to create extensions
    const targetClient = new Client({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });

    await targetClient.connect();
    
    // Create UUID extension
    await targetClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension created');
    
    // Create pgcrypto extension for password hashing
    await targetClient.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    console.log('✅ pgcrypto extension created');

    await targetClient.end();

    console.log('✅ Database reset completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Run migrations: npm run db:migrate');
    console.log('   2. Seed sample data: npm run db:seed');

  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   - macOS: brew services start postgresql');
      console.error('   - Ubuntu: sudo systemctl start postgresql');
      console.error('   - Docker: docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:13');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('⚠️  This will permanently delete all data. Are you sure? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      resetDatabase();
    } else {
      console.log('❌ Operation cancelled');
      process.exit(0);
    }
    rl.close();
  });
}

module.exports = { resetDatabase };