#!/usr/bin/env node

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function runMigrations() {
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
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
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

    // Define models directly in migration script
    console.log('🔄 Creating database tables...');

    // User model
    const User = sequelize.define('User', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      username: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      firstName: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      lastName: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      role: {
        type: Sequelize.ENUM('admin', 'user'),
        defaultValue: 'user',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    }, {
      timestamps: true,
      tableName: 'users',
    });

    // Workflow model
    const Workflow = sequelize.define('Workflow', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      nodes: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      connections: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: [],
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: {},
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      version: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: [],
      },
    }, {
      timestamps: true,
      tableName: 'workflows',
    });

    // Execution model
    const Execution = sequelize.define('Execution', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      workflowId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'workflows',
          key: 'id',
        },
      },
      status: {
        type: Sequelize.ENUM('pending', 'running', 'success', 'error', 'cancelled'),
        defaultValue: 'pending',
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      executionTime: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Execution time in milliseconds',
      },
      mode: {
        type: Sequelize.ENUM('manual', 'trigger', 'test'),
        defaultValue: 'manual',
      },
    }, {
      timestamps: true,
      tableName: 'executions',
    });

    // Webhook model
    const Webhook = sequelize.define('Webhook', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      workflowId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'workflows',
          key: 'id',
        },
      },
      path: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      method: {
        type: Sequelize.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
        defaultValue: 'POST',
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      headers: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      authentication: {
        type: Sequelize.JSON,
        allowNull: true,
      },
    }, {
      timestamps: true,
      tableName: 'webhooks',
    });

    // Trigger model
    const Trigger = sequelize.define('Trigger', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      workflowId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'workflows',
          key: 'id',
        },
      },
      type: {
        type: Sequelize.ENUM('cron', 'interval', 'webhook', 'manual'),
        allowNull: false,
      },
      config: {
        type: Sequelize.JSON,
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      lastTriggered: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      nextTrigger: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    }, {
      timestamps: true,
      tableName: 'triggers',
    });

    // ExecutionLog model
    const ExecutionLog = sequelize.define('ExecutionLog', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      executionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'executions',
          key: 'id',
        },
      },
      nodeId: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      nodeName: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('running', 'success', 'error', 'skipped'),
        allowNull: false,
      },
      startedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      finishedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      input: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      output: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
    }, {
      timestamps: false,
      tableName: 'execution_logs',
    });

    // Sync all models
    console.log('🔄 Synchronizing database schema...');
    await sequelize.sync({ force: false });
    
    console.log('✅ Database migration completed successfully!');
    console.log('📊 Created tables:');
    console.log('   - users');
    console.log('   - workflows');
    console.log('   - executions');
    console.log('   - execution_logs');
    console.log('   - webhooks');
    console.log('   - triggers');
    
    await sequelize.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };