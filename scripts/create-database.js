#!/usr/bin/env node

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function createDatabase() {
  const dbName = process.env.DB_NAME || 'workflow_automation';
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 3306;

  // Connect to MySQL server (without specifying database)
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
  });

  try {
    console.log('✅ Connected to MySQL server');

    // Create database if it doesn't exist
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`✅ Database "${dbName}" created/verified successfully`);

    // Use the database
    await connection.query(`USE \`${dbName}\``);
    console.log(`✅ Using database "${dbName}"`);

    console.log('✅ Database setup completed successfully!');

  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Make sure MySQL is running:');
      console.error('   - Windows: Check MySQL service in Services');
      console.error('   - macOS: brew services start mysql');
      console.error('   - Ubuntu: sudo systemctl start mysql');
      console.error('   - Docker: docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=password mysql:8');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Access denied. Check your MySQL credentials in .env file:');
      console.error('   DB_USER=root');
      console.error('   DB_PASSWORD=yourpassword');
    }
    
    process.exit(1);
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  createDatabase();
}

module.exports = { createDatabase };