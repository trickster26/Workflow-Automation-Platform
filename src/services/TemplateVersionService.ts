import { Sequelize, DataTypes, Model } from 'sequelize';
import { logger } from '../utils/logger';
import { WorkflowTemplate } from './WorkflowTemplateService';
import * as semver from 'semver';
import * as crypto from 'crypto';

export interface TemplateVersion {
  id?: number;
  templateId: number;
  version: string;
  isLatest: boolean;
  templateData: any;
  changeLog: {
    version: string;
    date: string;
    author: {
      id: number;
      name: string;
    };
    changes: {
      type: 'added' | 'changed' | 'fixed' | 'removed' | 'deprecated' | 'security';
      description: string;
      breaking?: boolean;
    }[];
    migrationNotes?: string;
  };
  metadata: {
    nodeCount: number;
    complexity: 'simple' | 'intermediate' | 'advanced';
    checksumHash: string;
    backwardCompatible: boolean;
    requiredMigrations: string[];
  };
  status: 'draft' | 'published' | 'deprecated' | 'archived';
  publishedAt?: Date;
  createdBy: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface VersionComparison {
  from: string;
  to: string;
  changes: {
    nodes: {
      added: any[];
      removed: any[];
      modified: any[];
    };
    connections: {
      added: any[];
      removed: any[];
      modified: any[];
    };
    settings: {
      added: any[];
      removed: any[];
      modified: any[];
    };
    variables: {
      added: any[];
      removed: any[];
      modified: any[];
    };
  };
  compatibility: {
    isBackwardCompatible: boolean;
    isForwardCompatible: boolean;
    breakingChanges: string[];
    warnings: string[];
  };
  migrationPath: {
    required: boolean;
    steps: string[];
    automated: boolean;
  };
}

export interface VersionBranch {
  name: string;
  baseVersion: string;
  headVersion: string;
  versions: string[];
  isMainBranch: boolean;
  description?: string;
  createdBy: number;
  createdAt: Date;
}

class TemplateVersionModel extends Model<TemplateVersion> implements TemplateVersion {
  public id!: number;
  public templateId!: number;
  public version!: string;
  public isLatest!: boolean;
  public templateData!: any;
  public changeLog!: any;
  public metadata!: any;
  public status!: 'draft' | 'published' | 'deprecated' | 'archived';
  public publishedAt!: Date;
  public createdBy!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

export class TemplateVersionService {
  private sequelize: Sequelize;
  private TemplateVersion: typeof TemplateVersionModel;

  constructor(sequelize: Sequelize) {
    this.sequelize = sequelize;
    this.TemplateVersion = TemplateVersionModel;
    this.initModel();
  }

  private initModel(): void {
    this.TemplateVersion.init(
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        templateId: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        version: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        isLatest: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        templateData: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        changeLog: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        metadata: {
          type: DataTypes.JSON,
          allowNull: false,
        },
        status: {
          type: DataTypes.ENUM('draft', 'published', 'deprecated', 'archived'),
          allowNull: false,
          defaultValue: 'draft',
        },
        publishedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
      },
      {
        sequelize: this.sequelize,
        tableName: 'template_versions',
        timestamps: true,
        indexes: [
          { fields: ['templateId'] },
          { fields: ['version'] },
          { fields: ['isLatest'] },
          { fields: ['status'] },
          { fields: ['publishedAt'] },
          { fields: ['createdBy'] },
          { unique: true, fields: ['templateId', 'version'] },
        ],
      }
    );
  }

  async createVersion(versionData: Omit<TemplateVersion, 'id'>): Promise<TemplateVersion> {
    const transaction = await this.sequelize.transaction();

    try {
      logger.info(`Creating template version: ${versionData.templateId}@${versionData.version}`);

      // Validate version format
      if (!semver.valid(versionData.version)) {
        throw new Error('Invalid version format. Must follow semantic versioning (e.g., 1.0.0)');
      }

      // Check if version already exists
      const existingVersion = await this.TemplateVersion.findOne({
        where: {
          templateId: versionData.templateId,
          version: versionData.version,
        },
        transaction,
      });

      if (existingVersion) {
        throw new Error(`Version ${versionData.version} already exists for this template`);
      }

      // Generate metadata
      const checksumHash = this.generateTemplateChecksum(versionData.templateData);
      const nodeCount = versionData.templateData.nodes?.length || 0;
      const complexity = this.calculateComplexity(versionData.templateData);

      // Check backward compatibility
      const backwardCompatible = await this.checkBackwardCompatibility(
        versionData.templateId,
        versionData.templateData,
        transaction
      );

      const versionWithMetadata = {
        ...versionData,
        metadata: {
          ...versionData.metadata,
          nodeCount,
          complexity,
          checksumHash,
          backwardCompatible,
          requiredMigrations: versionData.metadata.requiredMigrations || [],
        },
      };

      // Create version
      const version = await this.TemplateVersion.create(versionWithMetadata, { transaction });

      // Update latest version flag if this is the latest
      if (versionData.isLatest) {
        await this.updateLatestVersion(versionData.templateId, versionData.version, transaction);
      }

      await transaction.commit();

      logger.info(`Template version created successfully: ${version.id}`);
      return version.toJSON();
    } catch (error: any) {
      await transaction.rollback();
      logger.error('Error creating template version:', error);
      throw new Error(`Failed to create template version: ${error.message}`);
    }
  }

  async getVersion(templateId: number, version: string): Promise<TemplateVersion | null> {
    try {
      const templateVersion = await this.TemplateVersion.findOne({
        where: {
          templateId,
          version,
        },
      });

      return templateVersion ? templateVersion.toJSON() : null;
    } catch (error: any) {
      logger.error('Error getting template version:', error);
      throw new Error(`Failed to get template version: ${error.message}`);
    }
  }

  async getLatestVersion(templateId: number): Promise<TemplateVersion | null> {
    try {
      const latestVersion = await this.TemplateVersion.findOne({
        where: {
          templateId,
          isLatest: true,
        },
      });

      return latestVersion ? latestVersion.toJSON() : null;
    } catch (error: any) {
      logger.error('Error getting latest template version:', error);
      throw new Error(`Failed to get latest template version: ${error.message}`);
    }
  }

  async listVersions(templateId: number): Promise<TemplateVersion[]> {
    try {
      const versions = await this.TemplateVersion.findAll({
        where: { templateId },
        order: [['createdAt', 'DESC']],
      });

      return versions.map(v => v.toJSON());
    } catch (error: any) {
      logger.error('Error listing template versions:', error);
      throw new Error(`Failed to list template versions: ${error.message}`);
    }
  }

  async publishVersion(templateId: number, version: string): Promise<TemplateVersion> {
    const transaction = await this.sequelize.transaction();

    try {
      logger.info(`Publishing template version: ${templateId}@${version}`);

      const templateVersion = await this.TemplateVersion.findOne({
        where: {
          templateId,
          version,
        },
        transaction,
      });

      if (!templateVersion) {
        throw new Error('Template version not found');
      }

      if (templateVersion.status === 'published') {
        throw new Error('Version is already published');
      }

      // Update status and publish date
      await templateVersion.update({
        status: 'published',
        publishedAt: new Date(),
      }, { transaction });

      // Make this the latest version if it's the highest semantic version
      const allVersions = await this.TemplateVersion.findAll({
        where: { templateId },
        attributes: ['version'],
        transaction,
      });

      const versions = allVersions.map(v => v.version).filter(v => semver.valid(v));
      const latestSemVer = semver.maxSatisfying(versions, '*');

      if (latestSemVer === version) {
        await this.updateLatestVersion(templateId, version, transaction);
      }

      await transaction.commit();

      logger.info(`Template version published successfully: ${templateVersion.id}`);
      return templateVersion.toJSON();
    } catch (error: any) {
      await transaction.rollback();
      logger.error('Error publishing template version:', error);
      throw new Error(`Failed to publish template version: ${error.message}`);
    }
  }

  async deprecateVersion(templateId: number, version: string, reason?: string): Promise<TemplateVersion> {
    try {
      logger.info(`Deprecating template version: ${templateId}@${version}`);

      const templateVersion = await this.TemplateVersion.findOne({
        where: {
          templateId,
          version,
        },
      });

      if (!templateVersion) {
        throw new Error('Template version not found');
      }

      const updatedChangeLog = {
        ...templateVersion.changeLog,
        deprecationReason: reason,
        deprecatedAt: new Date().toISOString(),
      };

      await templateVersion.update({
        status: 'deprecated',
        changeLog: updatedChangeLog,
      });

      logger.info(`Template version deprecated successfully: ${templateVersion.id}`);
      return templateVersion.toJSON();
    } catch (error: any) {
      logger.error('Error deprecating template version:', error);
      throw new Error(`Failed to deprecate template version: ${error.message}`);
    }
  }

  async compareVersions(
    templateId: number,
    fromVersion: string,
    toVersion: string
  ): Promise<VersionComparison> {
    try {
      logger.info(`Comparing template versions: ${templateId}@${fromVersion} -> ${toVersion}`);

      const fromVersionData = await this.getVersion(templateId, fromVersion);
      const toVersionData = await this.getVersion(templateId, toVersion);

      if (!fromVersionData || !toVersionData) {
        throw new Error('One or both versions not found');
      }

      return this.generateVersionComparison(fromVersionData, toVersionData);
    } catch (error: any) {
      logger.error('Error comparing template versions:', error);
      throw new Error(`Failed to compare template versions: ${error.message}`);
    }
  }

  async createBranch(
    templateId: number,
    branchName: string,
    baseVersion: string,
    userId: number,
    description?: string
  ): Promise<VersionBranch> {
    try {
      logger.info(`Creating version branch: ${branchName} from ${templateId}@${baseVersion}`);

      // Validate base version exists
      const baseVersionData = await this.getVersion(templateId, baseVersion);
      if (!baseVersionData) {
        throw new Error('Base version not found');
      }

      // Create branch metadata (this would typically be stored in a separate branches table)
      const branch: VersionBranch = {
        name: branchName,
        baseVersion,
        headVersion: baseVersion,
        versions: [baseVersion],
        isMainBranch: false,
        description,
        createdBy: userId,
        createdAt: new Date(),
      };

      logger.info(`Version branch created successfully: ${branchName}`);
      return branch;
    } catch (error: any) {
      logger.error('Error creating version branch:', error);
      throw new Error(`Failed to create version branch: ${error.message}`);
    }
  }

  async mergeBranch(
    templateId: number,
    sourceBranch: string,
    targetBranch: string,
    userId: number,
    mergeStrategy: 'merge' | 'rebase' | 'squash' = 'merge'
  ): Promise<{
    success: boolean;
    newVersion: string;
    conflicts: string[];
  }> {
    try {
      logger.info(`Merging branch ${sourceBranch} into ${targetBranch} for template ${templateId}`);

      // This would implement branch merging logic
      // For now, return a placeholder response
      const newVersion = this.generateNextVersion(templateId, 'minor');

      return {
        success: true,
        newVersion,
        conflicts: [],
      };
    } catch (error: any) {
      logger.error('Error merging version branch:', error);
      throw new Error(`Failed to merge version branch: ${error.message}`);
    }
  }

  async rollbackToVersion(templateId: number, targetVersion: string, userId: number): Promise<{
    success: boolean;
    newVersion: string;
    rollbackData: any;
  }> {
    try {
      logger.info(`Rolling back template ${templateId} to version ${targetVersion}`);

      const targetVersionData = await this.getVersion(templateId, targetVersion);
      if (!targetVersionData) {
        throw new Error('Target version not found');
      }

      // Create new version based on target version data
      const newVersion = this.generateNextVersion(templateId, 'patch');
      
      await this.createVersion({
        templateId,
        version: newVersion,
        isLatest: true,
        templateData: targetVersionData.templateData,
        changeLog: {
          version: newVersion,
          date: new Date().toISOString(),
          author: { id: userId, name: 'User' },
          changes: [{
            type: 'changed',
            description: `Rolled back to version ${targetVersion}`,
          }],
        },
        metadata: {
          ...targetVersionData.metadata,
          requiredMigrations: [`rollback-to-${targetVersion}`],
        },
        status: 'draft',
        createdBy: userId,
      });

      return {
        success: true,
        newVersion,
        rollbackData: targetVersionData.templateData,
      };
    } catch (error: any) {
      logger.error('Error rolling back template version:', error);
      throw new Error(`Failed to rollback template version: ${error.message}`);
    }
  }

  async getVersionHistory(
    templateId: number,
    options: {
      limit?: number;
      offset?: number;
      includeDeprecated?: boolean;
      branch?: string;
    } = {}
  ): Promise<{
    versions: TemplateVersion[];
    total: number;
    branches: string[];
  }> {
    try {
      const where: any = { templateId };
      
      if (!options.includeDeprecated) {
        where.status = { [Sequelize.Op.ne]: 'deprecated' };
      }

      const { rows: versions, count: total } = await this.TemplateVersion.findAndCountAll({
        where,
        limit: options.limit || 50,
        offset: options.offset || 0,
        order: [['createdAt', 'DESC']],
      });

      // Get unique branches (this would come from branches table in real implementation)
      const branches = ['main', 'development', 'hotfix'];

      return {
        versions: versions.map(v => v.toJSON()),
        total,
        branches,
      };
    } catch (error: any) {
      logger.error('Error getting version history:', error);
      throw new Error(`Failed to get version history: ${error.message}`);
    }
  }

  private async updateLatestVersion(
    templateId: number,
    newLatestVersion: string,
    transaction?: any
  ): Promise<void> {
    // Remove latest flag from all versions
    await this.TemplateVersion.update(
      { isLatest: false },
      { 
        where: { templateId },
        transaction,
      }
    );

    // Set latest flag on new version
    await this.TemplateVersion.update(
      { isLatest: true },
      {
        where: {
          templateId,
          version: newLatestVersion,
        },
        transaction,
      }
    );
  }

  private async checkBackwardCompatibility(
    templateId: number,
    newTemplateData: any,
    transaction?: any
  ): Promise<boolean> {
    try {
      // Get the latest published version
      const latestVersion = await this.TemplateVersion.findOne({
        where: {
          templateId,
          status: 'published',
        },
        order: [['publishedAt', 'DESC']],
        transaction,
      });

      if (!latestVersion) {
        return true; // First version is always compatible
      }

      // Simple compatibility check based on node types and connections
      const oldNodes = latestVersion.templateData.nodes || [];
      const newNodes = newTemplateData.nodes || [];
      
      const oldNodeTypes = new Set(oldNodes.map((n: any) => n.type));
      const newNodeTypes = new Set(newNodes.map((n: any) => n.type));

      // Check if any node types were removed (breaking change)
      for (const oldType of oldNodeTypes) {
        if (!newNodeTypes.has(oldType)) {
          return false;
        }
      }

      return true;
    } catch (error: any) {
      logger.error('Error checking backward compatibility:', error);
      return false;
    }
  }

  private generateVersionComparison(
    fromVersion: TemplateVersion,
    toVersion: TemplateVersion
  ): VersionComparison {
    const fromData = fromVersion.templateData;
    const toData = toVersion.templateData;

    // Compare nodes
    const fromNodes = fromData.nodes || [];
    const toNodes = toData.nodes || [];
    
    const fromNodeIds = new Set(fromNodes.map((n: any) => n.id));
    const toNodeIds = new Set(toNodes.map((n: any) => n.id));

    const addedNodes = toNodes.filter((n: any) => !fromNodeIds.has(n.id));
    const removedNodes = fromNodes.filter((n: any) => !toNodeIds.has(n.id));
    const modifiedNodes = toNodes.filter((n: any) => {
      if (!fromNodeIds.has(n.id)) return false;
      const fromNode = fromNodes.find((fn: any) => fn.id === n.id);
      return JSON.stringify(fromNode) !== JSON.stringify(n);
    });

    // Compare connections
    const fromConnections = fromData.connections || [];
    const toConnections = toData.connections || [];
    
    const fromConnectionIds = new Set(fromConnections.map((c: any) => `${c.source}-${c.target}`));
    const toConnectionIds = new Set(toConnections.map((c: any) => `${c.source}-${c.target}`));

    const addedConnections = toConnections.filter((c: any) => !fromConnectionIds.has(`${c.source}-${c.target}`));
    const removedConnections = fromConnections.filter((c: any) => !toConnectionIds.has(`${c.source}-${c.target}`));

    // Determine compatibility
    const breakingChanges: string[] = [];
    
    if (removedNodes.length > 0) {
      breakingChanges.push(`Removed ${removedNodes.length} node(s)`);
    }
    
    if (removedConnections.length > 0) {
      breakingChanges.push(`Removed ${removedConnections.length} connection(s)`);
    }

    const isBackwardCompatible = breakingChanges.length === 0;

    return {
      from: fromVersion.version,
      to: toVersion.version,
      changes: {
        nodes: {
          added: addedNodes,
          removed: removedNodes,
          modified: modifiedNodes,
        },
        connections: {
          added: addedConnections,
          removed: removedConnections,
          modified: [],
        },
        settings: {
          added: [],
          removed: [],
          modified: [],
        },
        variables: {
          added: [],
          removed: [],
          modified: [],
        },
      },
      compatibility: {
        isBackwardCompatible,
        isForwardCompatible: true, // Simplified assumption
        breakingChanges,
        warnings: [],
      },
      migrationPath: {
        required: !isBackwardCompatible,
        steps: breakingChanges.map(change => `Migration required for: ${change}`),
        automated: false,
      },
    };
  }

  private generateNextVersion(templateId: number, increment: 'major' | 'minor' | 'patch'): string {
    // This would typically get the latest version and increment it
    // For now, return a placeholder
    const baseVersion = '1.0.0';
    
    switch (increment) {
      case 'major':
        return semver.inc(baseVersion, 'major') || '2.0.0';
      case 'minor':
        return semver.inc(baseVersion, 'minor') || '1.1.0';
      case 'patch':
        return semver.inc(baseVersion, 'patch') || '1.0.1';
    }
  }

  private generateTemplateChecksum(templateData: any): string {
    const dataString = JSON.stringify(templateData, null, 0);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private calculateComplexity(templateData: any): 'simple' | 'intermediate' | 'advanced' {
    const nodeCount = templateData.nodes?.length || 0;
    const connectionCount = templateData.connections?.length || 0;
    const totalElements = nodeCount + connectionCount;

    if (totalElements <= 5) return 'simple';
    if (totalElements <= 15) return 'intermediate';
    return 'advanced';
  }
}