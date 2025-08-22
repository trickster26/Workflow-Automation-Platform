#!/usr/bin/env node

const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function seedDatabase() {
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      database: process.env.DB_NAME || 'workflow_automation',
      username: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
    };

    console.log('🔄 Connecting to database...');
    const sequelize = new Sequelize({
      ...dbConfig,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Define User model for seeding
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      username: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('admin', 'user'),
        defaultValue: 'user',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      timestamps: true,
      tableName: 'users',
    });

    // Define Workflow model for seeding
    const Workflow = sequelize.define('Workflow', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      nodes: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      connections: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      settings: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: {},
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      version: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
      },
    }, {
      timestamps: true,
      tableName: 'workflows',
    });

    console.log('🔄 Seeding database with sample data...');

    // Create sample admin user if none exists
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@example.com' },
      defaults: {
        email: 'admin@example.com',
        username: 'admin',
        password: await bcrypt.hash('AdminPass123!', 10),
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        isActive: true,
      }
    });

    if (adminCreated) {
      console.log('✅ Created admin user:', adminUser.email);
    } else {
      console.log('✅ Admin user already exists:', adminUser.email);
    }

    // Create sample regular user
    const [regularUser, userCreated] = await User.findOrCreate({
      where: { email: 'user@example.com' },
      defaults: {
        email: 'user@example.com',
        username: 'johndoe',
        password: await bcrypt.hash('UserPass123!', 10),
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
        isActive: true,
      }
    });

    if (userCreated) {
      console.log('✅ Created regular user:', regularUser.email);
    } else {
      console.log('✅ Regular user already exists:', regularUser.email);
    }

    // Create sample workflows for the admin user
    const existingWorkflow = await Workflow.findOne({
      where: { name: 'Welcome Email Workflow' }
    });

    if (!existingWorkflow) {
      const workflow1 = await Workflow.create({
        userId: adminUser.id,
        name: 'Welcome Email Workflow',
        description: 'Sends a welcome email when a new user signs up',
        nodes: [
          {
            id: 'trigger-1',
            type: 'webhook',
            name: 'User Signup Webhook',
            position: { x: 100, y: 100 },
            data: {
              path: '/webhook/user-signup',
              method: 'POST'
            }
          },
          {
            id: 'email-1',
            type: 'email',
            name: 'Send Welcome Email',
            position: { x: 300, y: 100 },
            data: {
              to: '{{trigger.email}}',
              subject: 'Welcome to our platform!',
              body: 'Hello {{trigger.name}}, welcome aboard!'
            }
          }
        ],
        connections: [
          {
            source: 'trigger-1',
            target: 'email-1'
          }
        ],
        settings: {
          errorHandling: 'continue',
          timeout: 30000
        },
        isActive: true,
        tags: ['email', 'onboarding']
      });
      console.log('✅ Created sample workflow:', workflow1.name);

      // Create another sample workflow
      const workflow2 = await Workflow.create({
        userId: adminUser.id,
        name: 'Daily Report Generator',
        description: 'Generates and sends daily reports',
        nodes: [
          {
            id: 'trigger-2',
            type: 'cron',
            name: 'Daily Trigger',
            position: { x: 100, y: 100 },
            data: {
              expression: '0 9 * * *',
              timezone: 'UTC'
            }
          },
          {
            id: 'db-1',
            type: 'database',
            name: 'Fetch Data',
            position: { x: 300, y: 100 },
            data: {
              operation: 'select',
              table: 'reports',
              conditions: {
                date: '{{today}}'
              }
            }
          },
          {
            id: 'transform-1',
            type: 'transform',
            name: 'Format Report',
            position: { x: 500, y: 100 },
            data: {
              template: 'Daily Report for {{date}}'
            }
          },
          {
            id: 'email-2',
            type: 'email',
            name: 'Send Report',
            position: { x: 700, y: 100 },
            data: {
              to: 'admin@example.com',
              subject: 'Daily Report',
              body: '{{report}}'
            }
          }
        ],
        connections: [
          {
            source: 'trigger-2',
            target: 'db-1'
          },
          {
            source: 'db-1',
            target: 'transform-1'
          },
          {
            source: 'transform-1',
            target: 'email-2'
          }
        ],
        settings: {
          errorHandling: 'stop',
          timeout: 60000,
          retries: 3
        },
        isActive: false,
        tags: ['reporting', 'scheduled']
      });
      console.log('✅ Created sample workflow:', workflow2.name);
    } else {
      console.log('✅ Sample workflows already exist');
    }

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📋 Sample Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Account:');
    console.log('  Email: admin@example.com');
    console.log('  Password: AdminPass123!');
    console.log('\nUser Account:');
    console.log('  Email: user@example.com');
    console.log('  Password: UserPass123!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };