#!/usr/bin/env node

const { Client } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  const dbName = process.env.DB_NAME || 'workflow_automation';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;

  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  });

  try {
    console.log('🔍 Testing database connection...');
    console.log(`Host: ${dbHost}:${dbPort}`);
    console.log(`Database: ${dbName}`);
    console.log(`User: ${dbUser}`);

    await client.connect();
    console.log('✅ Database connection successful');

    // Test query
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL Version:', result.rows[0].version.split(' ')[0], result.rows[0].version.split(' ')[1]);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length > 0) {
      console.log('✅ Tables found:', tablesResult.rows.map(row => row.table_name).join(', '));
    } else {
      console.log('⚠️  No tables found - run migrations: npm run db:migrate');
    }

    await client.end();
    console.log('✅ Database test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure PostgreSQL is running:');
      console.error('   - macOS: brew services start postgresql');
      console.error('   - Ubuntu: sudo systemctl start postgresql');
      console.error('   - Docker: docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:13');
    } else if (error.code === '3D000') {
      console.error(`\n💡 Database "${dbName}" doesn't exist. Run: npm run db:create`);
    } else if (error.code === '28P01') {
      console.error('\n💡 Authentication failed. Check your database credentials in .env file');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection };