# Data Persistence Layer

## Overview

The Workflow Automation Platform features a comprehensive data persistence layer that provides:

- **Advanced Migration System**: Version-controlled database schema changes
- **Automated Backup & Recovery**: Full database backups with compression and encryption
- **Data Validation**: Comprehensive integrity checks and consistency validation
- **Intelligent Archival**: Automated data archiving with configurable policies
- **Performance Optimization**: Database indexing, query optimization, and maintenance

## Architecture

```
Data Persistence Layer
├── Migration Service      - Schema versioning and migrations
├── Backup Service         - Database backup and restore
├── Validation Service     - Data integrity and consistency checks
├── Archival Service       - Historical data management
└── Management Controller  - API endpoints for data operations
```

## Core Services

### 1. Data Migration Service

Handles database schema evolution with version control:

```typescript
// Run all pending migrations
await dataMigrationService.runMigrations();

// Get migration status
const status = await dataMigrationService.getMigrationStatus();

// Rollback specific migration
await dataMigrationService.rollbackMigration('003');

// Validate database integrity
const integrity = await dataMigrationService.validateDatabaseIntegrity();
```

**Features:**
- ✅ **Version Control**: Track schema changes with version numbers
- ✅ **Rollback Support**: Safely revert problematic migrations  
- ✅ **Integrity Validation**: Check foreign keys, indexes, and constraints
- ✅ **Performance Indexes**: Automatic index creation for query optimization
- ✅ **Audit Tables**: Track all data changes with full history

### 2. Data Backup Service

Comprehensive backup and restore capabilities:

```typescript
// Create full backup with compression
const backup = await dataBackupService.createBackup({
  name: 'daily-backup',
  type: 'full',
  compress: true,
  encrypt: true,
  encryptionKey: 'secure-key',
  includeFiles: true,
  maxRetention: 30
});

// Restore from backup
await dataBackupService.restoreBackup({
  backupId: backup.id,
  verifyIntegrity: true,
  dropExisting: false
});
```

**Features:**
- ✅ **Multiple Formats**: JSON, CSV, SQL export formats
- ✅ **Compression**: GZIP compression to reduce storage space
- ✅ **Encryption**: AES-256 encryption for sensitive data
- ✅ **Incremental Backups**: Only backup changed data
- ✅ **File Backups**: Include application files and logs
- ✅ **Integrity Verification**: Checksum validation
- ✅ **Automated Retention**: Cleanup old backups automatically

### 3. Data Validation Service

Ensures data integrity and consistency:

```typescript
// Run all validation rules
const report = await dataValidationService.runValidation();

// Run specific rules
const report = await dataValidationService.runValidation(['workflow-nodes-exist']);

// Get available validation rules
const rules = dataValidationService.getValidationRules();
```

**Validation Categories:**

**🏗️ Structural Validation**
- Workflows must have nodes
- Valid node connections
- Required node parameters
- No orphaned records

**📋 Business Logic Validation**  
- Active workflows have triggers
- Workflows have start nodes
- Valid credential references
- Unique webhook paths

**⚡ Performance Validation**
- Large workflow detection
- Long-running executions
- High failure rate analysis

**🔒 Security Validation**
- No exposed credentials
- Secure webhook configurations
- Proper access permissions

### 4. Data Archival Service

Intelligent historical data management:

```typescript
// Create archival policy
const policy = await dataArchivalService.createArchivalPolicy({
  name: 'Execution Archival',
  table: 'executions',
  retentionPeriod: 90,
  archiveFormat: 'json',
  compressionEnabled: true,
  deleteAfterArchive: true
});

// Run archival jobs
const jobs = await dataArchivalService.runArchivalJobs();

// Estimate impact
const impact = await dataArchivalService.estimateArchivalImpact(policy.id);
```

**Features:**
- ✅ **Flexible Policies**: Configure retention per table/data type
- ✅ **Multiple Formats**: JSON, CSV, SQL archives
- ✅ **Smart Scheduling**: Automatic archival based on conditions
- ✅ **Storage Optimization**: Compress and encrypt archives
- ✅ **Impact Analysis**: Preview archival effects before execution

## API Endpoints

### Data Overview
```bash
GET /api/data/overview
# Get comprehensive data management status
```

### Database Operations
```bash
POST /api/data/optimize          # Optimize database performance
GET  /api/database/validate      # Validate database integrity
```

### Migrations
```bash
POST /api/migrations/run                    # Run pending migrations
GET  /api/migrations/status                 # Get migration status
POST /api/migrations/{version}/rollback     # Rollback migration
```

### Backups
```bash
POST   /api/backups              # Create new backup
POST   /api/backups/restore      # Restore from backup
GET    /api/backups              # List all backups
DELETE /api/backups/{id}         # Delete specific backup
GET    /api/backups/stats        # Get backup statistics
```

### Validation
```bash
POST /api/validation/run                    # Run data validation
GET  /api/validation/rules                  # Get validation rules
POST /api/validation/{rule}/{record}/fix   # Auto-fix issue
```

### Archival
```bash
POST   /api/archival/run                           # Run archival jobs
GET    /api/archival/policies                      # List archival policies
POST   /api/archival/policies                      # Create new policy
PUT    /api/archival/policies/{id}                 # Update policy
DELETE /api/archival/policies/{id}                 # Delete policy
GET    /api/archival/policies/{id}/estimate        # Estimate impact
```

## Configuration Examples

### Backup Configuration
```javascript
const backupConfig = {
  name: "production-backup",
  description: "Daily production backup",
  type: "full",
  compress: true,
  encrypt: true,
  encryptionKey: process.env.BACKUP_KEY,
  includeFiles: true,
  tables: ["workflows", "executions", "users"],
  maxRetention: 30
};
```

### Archival Policy
```javascript
const archivalPolicy = {
  name: "Execution History Cleanup",
  description: "Archive old completed executions",
  table: "executions",
  retentionPeriod: 90,
  archiveAfter: 90,
  conditions: {
    status: ["completed", "error"],
    finished: true
  },
  archiveFormat: "json",
  compressionEnabled: true,
  deleteAfterArchive: true
};
```

### Migration Example
```typescript
const migration = {
  version: '006',
  name: 'add_execution_tags',
  description: 'Add tags column to executions table',
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('executions', 'tags', {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    });

    await queryInterface.addIndex('executions', ['tags'], {
      name: 'idx_executions_tags',
      using: 'gin'
    });
  },
  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('executions', 'idx_executions_tags');
    await queryInterface.removeColumn('executions', 'tags');
  },
};
```

## Performance Optimizations

### Database Indexes
The migration system automatically creates performance indexes:

```sql
-- Workflow indexes
CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_active ON workflows(active);
CREATE INDEX idx_workflows_user_active ON workflows(user_id, active);

-- Execution indexes  
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_workflow_status ON executions(workflow_id, status);

-- Webhook indexes
CREATE INDEX idx_webhooks_method_path ON webhooks(method, path);
CREATE INDEX idx_webhooks_workflow_id ON webhooks(workflow_id);
```

### Query Optimization
- Composite indexes for common query patterns
- JSONB indexes for document searches
- Partial indexes for filtered queries
- Regular VACUUM and ANALYZE operations

### Storage Management
- Automated archival of historical data
- Compressed backups to save storage
- Retention policies to prevent unbounded growth
- Regular cleanup of temporary data

## Monitoring & Maintenance

### Health Checks
```bash
# Check migration status
curl -X GET http://localhost:3000/api/migrations/status

# Validate database integrity  
curl -X GET http://localhost:3000/api/database/validate

# Get data overview
curl -X GET http://localhost:3000/api/data/overview
```

### Regular Maintenance Tasks
1. **Daily**: Automated backups
2. **Weekly**: Data validation checks
3. **Monthly**: Archival policy execution
4. **Quarterly**: Database optimization

### Alerts & Monitoring
The system provides comprehensive monitoring:
- Migration failures
- Backup completion status
- Validation rule violations
- Storage usage trends
- Performance degradation

## Best Practices

### Migration Guidelines
1. **Always test migrations** in development first
2. **Make migrations reversible** with proper down() functions
3. **Add indexes for new columns** that will be queried
4. **Use transactions** for multi-step migrations
5. **Document breaking changes** in migration descriptions

### Backup Strategy
1. **Schedule regular backups** (daily for production)
2. **Test restore procedures** regularly
3. **Store backups securely** with encryption
4. **Implement retention policies** to manage storage
5. **Monitor backup sizes** for unexpected growth

### Data Validation
1. **Run validation regularly** (weekly or after major changes)
2. **Address errors immediately** (structural issues)
3. **Review warnings periodically** (performance/security)
4. **Create custom rules** for business-specific requirements
5. **Track trends** in validation results

### Archival Management
1. **Define clear retention policies** based on business needs
2. **Archive old data regularly** to maintain performance
3. **Compress archives** to minimize storage costs
4. **Test archival restoration** procedures
5. **Document archive locations** and retention periods

## Security Considerations

### Data Protection
- **Encryption at rest**: All backups can be encrypted with AES-256
- **Access controls**: Role-based permissions for data operations
- **Audit logging**: Track all data management operations
- **Secure storage**: Backups stored in secure, isolated locations

### Compliance
- **Data retention**: Configurable retention policies for compliance
- **Right to erasure**: Support for data deletion requests
- **Audit trails**: Complete history of data changes
- **Export capabilities**: Data portability requirements

---

**Task 6: Create data persistence layer** is now complete! 

The system now provides enterprise-grade data management capabilities including migrations, backups, validation, archival, and comprehensive monitoring through a robust API interface. 🚀