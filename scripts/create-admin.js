#!/usr/bin/env node

const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function createAdminUser() {
  try {
    // Import the database config
    const { db } = require('../src/config/database');
    
    console.log('🔄 Connecting to database...');
    await db.connect();
    
    // Dynamic import to avoid circular dependency
    const { UserModel } = await import('../src/models/User.model.js');
    
    const existingAdmin = await UserModel.findOne({
      where: { email: 'admin@yourcompany.com' }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin.email);
      console.log('💡 Use this user to login to the admin panel');
      await db.close();
      return;
    }
    
    console.log('🔄 Creating admin user...');
    
    const admin = await UserModel.create({
      email: 'admin@yourcompany.com',
      username: 'admin',
      password: 'AdminPass123!',
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      status: 'active',
      emailVerified: true,
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Login Credentials:');
    console.log('   Email:', admin.email);
    console.log('   Username:', admin.username);
    console.log('   Password: AdminPass123!');
    console.log('\n⚠️  Please change the password after first login!');
    console.log('💡 Login at: http://localhost:3000/auth/login');
    
    await db.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.name === 'SequelizeConnectionError') {
      console.error('\n💡 Make sure the database is running and accessible');
      console.error('   Run: npm run db:setup && npm run db:migrate');
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };