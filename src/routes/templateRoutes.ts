import express from 'express';
import { WorkflowTemplateService } from '../services/WorkflowTemplateService';
import { TemplateImportExportService } from '../services/TemplateImportExportService';
import { TemplateCollaborationService } from '../services/TemplateCollaborationService';
import { TemplateValidationService } from '../services/TemplateValidationService';
import { TemplateSearchService } from '../services/TemplateSearchService';
import { templateService } from '../services/TemplateService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { createLogger } from '../utils/logger';

const logger = createLogger('TemplateRoutes');
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: './temp/uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.json', '.yaml', '.yml', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JSON, YAML, and ZIP files are allowed.'));
    }
  },
});

// Validation schemas
const createTemplateSchema = [
  body('name').notEmpty().withMessage('Name is required'),
  body('displayName').notEmpty().withMessage('Display name is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('templateData').isObject().withMessage('Template data is required'),
  body('tags').optional().isArray(),
  body('subcategory').optional().isString(),
  body('visibility').optional().isIn(['public', 'private', 'organization', 'shared']),
  body('documentation').optional().isObject(),
  body('metadata').optional().isObject(),
];

const updateTemplateSchema = [
  param('id').isInt().withMessage('Invalid template ID'),
  body('displayName').optional().notEmpty(),
  body('description').optional().notEmpty(),
  body('category').optional().notEmpty(),
  body('tags').optional().isArray(),
  body('visibility').optional().isIn(['public', 'private', 'organization', 'shared']),
  body('templateData').optional().isObject(),
  body('documentation').optional().isObject(),
];

const searchTemplatesSchema = [
  query('query').optional().isString(),
  query('category').optional().isString(),
  query('subcategory').optional().isString(),
  query('tags').optional().isString(),
  query('author').optional().isInt(),
  query('visibility').optional().isString(),
  query('status').optional().isString(),
  query('complexity').optional().isString(),
  query('sortBy').optional().isIn(['name', 'rating', 'downloads', 'created', 'updated', 'popularity']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
];

const reviewSchema = [
  param('id').isInt().withMessage('Invalid template ID'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('title').optional().isString(),
  body('comment').optional().isString(),
];

const exportTemplateSchema = [
  param('id').isInt().withMessage('Invalid template ID'),
  body('format').isIn(['json', 'yaml', 'zip']).withMessage('Format must be json, yaml, or zip'),
  body('includeCredentials').optional().isBoolean(),
  body('includeDependencies').optional().isBoolean(),
  body('includeDocumentation').optional().isBoolean(),
  body('includeMetadata').optional().isBoolean(),
  body('anonymize').optional().isBoolean(),
];

export function createTemplateRoutes(
  templateService: WorkflowTemplateService,
  importExportService: TemplateImportExportService,
  collaborationService: TemplateCollaborationService,
  validationService: TemplateValidationService,
  searchService: TemplateSearchService
) {
  // NEW TEMPLATE SYSTEM ROUTES
  
  // Get node templates
  router.get('/nodes', async (req, res) => {
    try {
      const options = {
        category: req.query.category as string,
        difficulty: req.query.difficulty as 'beginner' | 'intermediate' | 'advanced',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const templates = await templateService.getNodeTemplates(options);
      
      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error: any) {
      logger.error('Error fetching node templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get workflow templates  
  router.get('/workflows', async (req, res) => {
    try {
      const options = {
        category: req.query.category as string,
        difficulty: req.query.difficulty as 'beginner' | 'intermediate' | 'advanced',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const templates = await templateService.getWorkflowTemplates(options);
      
      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error: any) {
      logger.error('Error fetching workflow templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get scenario templates
  router.get('/scenarios', async (req, res) => {
    try {
      const options = {
        industry: req.query.industry as string,
        category: req.query.category as string,
        difficulty: req.query.difficulty as 'beginner' | 'intermediate' | 'advanced',
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const templates = await templateService.getScenarioTemplates(options);
      
      res.json({
        success: true,
        data: templates,
        count: templates.length
      });
    } catch (error: any) {
      logger.error('Error fetching scenario templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Template statistics
  router.get('/template-stats', async (req, res) => {
    try {
      const stats = await templateService.getTemplateStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error fetching template statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get template categories
  router.get('/categories', async (req, res) => {
    try {
      const categories = await templateService.getCategories();
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error: any) {
      logger.error('Error getting template categories:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Search templates (marketplace view)
  router.get(
    '/search',
    searchTemplatesSchema,
    validateRequest,
    async (req, res) => {
      try {
        const {
          query,
          category,
          subcategory,
          tags,
          author,
          visibility,
          status,
          complexity,
          sortBy,
          sortOrder,
          limit,
          offset,
          includeFeatured,
          includeOfficial
        } = req.query;

        const searchOptions: any = {
          limit: parseInt(limit as string) || 50,
          offset: parseInt(offset as string) || 0,
          sortBy: sortBy as string || 'popularity',
          sortOrder: sortOrder as string || 'desc',
        };

        if (query) searchOptions.query = query as string;
        if (category) searchOptions.category = category as string;
        if (subcategory) searchOptions.subcategory = subcategory as string;
        if (tags) searchOptions.tags = (tags as string).split(',');
        if (author) searchOptions.author = parseInt(author as string);
        if (visibility) searchOptions.visibility = (visibility as string).split(',');
        if (status) searchOptions.status = (status as string).split(',');
        if (complexity) searchOptions.complexity = (complexity as string).split(',');
        if (includeFeatured === 'true') searchOptions.includeFeatured = true;
        if (includeOfficial === 'true') searchOptions.includeOfficial = true;

        const result = await templateService.searchTemplates(searchOptions);

        res.json({
          success: true,
          data: result
        });
      } catch (error: any) {
        logger.error('Error searching templates:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get featured templates
  router.get('/featured', async (req, res) => {
    try {
      const result = await templateService.searchTemplates({
        includeFeatured: true,
        status: ['published'],
        visibility: ['public'],
        limit: 20,
        sortBy: 'popularity',
      });

      res.json({
        success: true,
        data: result.templates
      });
    } catch (error: any) {
      logger.error('Error getting featured templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get popular templates
  router.get('/popular', async (req, res) => {
    try {
      const result = await templateService.searchTemplates({
        status: ['published'],
        visibility: ['public'],
        limit: 50,
        sortBy: 'downloads',
        sortOrder: 'desc',
      });

      res.json({
        success: true,
        data: result.templates
      });
    } catch (error: any) {
      logger.error('Error getting popular templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get recent templates
  router.get('/recent', async (req, res) => {
    try {
      const result = await templateService.searchTemplates({
        status: ['published'],
        visibility: ['public'],
        limit: 20,
        sortBy: 'created',
        sortOrder: 'desc',
      });

      res.json({
        success: true,
        data: result.templates
      });
    } catch (error: any) {
      logger.error('Error getting recent templates:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Create template
  router.post(
    '/',
    authenticateToken,
    createTemplateSchema,
    validateRequest,
    async (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'User not authenticated'
          });
        }

        const templateData = {
          ...req.body,
          author: {
            id: userId,
            name: req.user?.name || 'User',
            email: req.user?.email,
          },
          version: req.body.version || '1.0.0',
          status: 'draft',
          isOfficial: false,
          isFeatured: false,
          rating: {
            average: 0,
            count: 0,
            breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
          },
          usage: {
            downloads: 0,
            installs: 0,
            forks: 0,
            views: 0
          },
          sharing: {
            allowForks: true,
            allowModifications: true,
            licenseType: 'MIT',
          },
        };

        const template = await templateService.createTemplate(templateData);

        logger.info(`Template created: ${template.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error creating template:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get template by ID
  router.get(
    '/:id',
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const template = await templateService.getTemplate(templateId);

        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        res.json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error getting template:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Update template
  router.put(
    '/:id',
    authenticateToken,
    updateTemplateSchema,
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = req.user?.id;

        // Check if user owns the template or is admin
        const existingTemplate = await templateService.getTemplate(templateId, false);
        if (!existingTemplate) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        if (existingTemplate.author.id !== userId && req.user?.role !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }

        const template = await templateService.updateTemplate(templateId, req.body);

        logger.info(`Template updated: ${templateId} by user ${userId}`);

        res.json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error updating template:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Delete template
  router.delete(
    '/:id',
    authenticateToken,
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = req.user?.id;

        // Check if user owns the template or is admin
        const existingTemplate = await templateService.getTemplate(templateId, false);
        if (!existingTemplate) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        if (existingTemplate.author.id !== userId && req.user?.role !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }

        await templateService.deleteTemplate(templateId);

        logger.info(`Template deleted: ${templateId} by user ${userId}`);

        res.json({
          success: true,
          message: 'Template deleted successfully'
        });
      } catch (error: any) {
        logger.error('Error deleting template:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Publish template
  router.post(
    '/:id/publish',
    authenticateToken,
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = req.user?.id;

        // Check if user owns the template
        const existingTemplate = await templateService.getTemplate(templateId, false);
        if (!existingTemplate) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        if (existingTemplate.author.id !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }

        const template = await templateService.publishTemplate(templateId);

        logger.info(`Template published: ${templateId} by user ${userId}`);

        res.json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error publishing template:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Fork template
  router.post(
    '/:id/fork',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      body('name').optional().isString(),
      body('description').optional().isString(),
      body('visibility').optional().isIn(['public', 'private', 'organization', 'shared']),
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = req.user?.id!;

        const forkedTemplate = await templateService.forkTemplate(templateId, userId, {
          name: req.body.name,
          description: req.body.description,
          visibility: req.body.visibility,
        });

        logger.info(`Template forked: ${templateId} -> ${forkedTemplate.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: forkedTemplate
        });
      } catch (error: any) {
        logger.error('Error forking template:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Add template review
  router.post(
    '/:id/reviews',
    authenticateToken,
    reviewSchema,
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = req.user?.id!;

        const review = await templateService.addReview(templateId, userId, {
          rating: req.body.rating,
          title: req.body.title,
          comment: req.body.comment,
        });

        logger.info(`Review added for template ${templateId} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: review
        });
      } catch (error: any) {
        logger.error('Error adding review:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Export template
  router.post(
    '/:id/export',
    authenticateToken,
    exportTemplateSchema,
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = req.user?.id;

        // Check access permissions
        const template = await templateService.getTemplate(templateId, false);
        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        if (template.visibility === 'private' && template.author.id !== userId) {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }

        const exportOptions = {
          format: req.body.format || 'json',
          includeCredentials: req.body.includeCredentials || false,
          includeDependencies: req.body.includeDependencies || true,
          includeDocumentation: req.body.includeDocumentation || true,
          includeMetadata: req.body.includeMetadata || true,
          anonymize: req.body.anonymize || false,
        };

        const result = await importExportService.exportTemplate(templateId, exportOptions);

        logger.info(`Template exported: ${templateId} by user ${userId}`);

        res.json({
          success: true,
          data: {
            downloadUrl: result.downloadUrl,
            format: exportOptions.format,
            size: result.bundle ? JSON.stringify(result.bundle).length : 0,
          }
        });
      } catch (error: any) {
        logger.error('Error exporting template:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Import template
  router.post(
    '/import',
    authenticateToken,
    upload.single('template'),
    async (req, res) => {
      try {
        const userId = req.user?.id!;
        const file = req.file;

        if (!file) {
          return res.status(400).json({
            success: false,
            error: 'Template file is required'
          });
        }

        // Read file content
        const fileContent = await fs.promises.readFile(file.path);
        
        const importOptions = {
          overwriteExisting: req.body.overwriteExisting === 'true',
          validateBeforeImport: req.body.validateBeforeImport !== 'false',
          updateCredentials: req.body.updateCredentials === 'true',
          customizations: req.body.customizations ? JSON.parse(req.body.customizations) : undefined,
          mappings: req.body.mappings ? JSON.parse(req.body.mappings) : undefined,
        };

        const template = await importExportService.importTemplate(
          fileContent,
          userId,
          importOptions
        );

        // Clean up uploaded file
        try {
          await fs.promises.unlink(file.path);
        } catch (error) {
          logger.warn('Failed to clean up uploaded file:', error);
        }

        logger.info(`Template imported: ${template.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error importing template:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
          try {
            await fs.promises.unlink(req.file.path);
          } catch (cleanupError) {
            logger.warn('Failed to clean up uploaded file:', cleanupError);
          }
        }

        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Import template from URL
  router.post(
    '/import-url',
    authenticateToken,
    [body('url').isURL().withMessage('Valid URL is required')],
    validateRequest,
    async (req, res) => {
      try {
        const userId = req.user?.id!;
        const { url } = req.body;

        const importOptions = {
          overwriteExisting: req.body.overwriteExisting || false,
          validateBeforeImport: req.body.validateBeforeImport !== false,
          updateCredentials: req.body.updateCredentials || false,
          customizations: req.body.customizations,
          mappings: req.body.mappings,
        };

        const template = await importExportService.importFromUrl(url, userId, importOptions);

        logger.info(`Template imported from URL: ${template.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error importing template from URL:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Create template from workflow
  router.post(
    '/from-workflow/:workflowId',
    authenticateToken,
    [
      param('workflowId').isInt().withMessage('Invalid workflow ID'),
      body('name').notEmpty().withMessage('Name is required'),
      body('displayName').notEmpty().withMessage('Display name is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('category').notEmpty().withMessage('Category is required'),
      body('tags').isArray().withMessage('Tags must be an array'),
    ],
    validateRequest,
    async (req, res) => {
      try {
        const workflowId = parseInt(req.params.workflowId);
        const userId = req.user?.id!;

        const template = await importExportService.createTemplateFromWorkflow(
          workflowId,
          userId,
          {
            name: req.body.name,
            displayName: req.body.displayName,
            description: req.body.description,
            category: req.body.category,
            tags: req.body.tags,
            documentation: req.body.documentation,
          }
        );

        logger.info(`Template created from workflow ${workflowId}: ${template.id} by user ${userId}`);

        res.status(201).json({
          success: true,
          data: template
        });
      } catch (error: any) {
        logger.error('Error creating template from workflow:', error);
        res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get user's templates
  router.get(
    '/user/:userId',
    authenticateToken,
    [param('userId').isInt().withMessage('Invalid user ID')],
    validateRequest,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.userId);
        const requestingUserId = req.user?.id;

        // Check if requesting user can view these templates
        if (userId !== requestingUserId && req.user?.role !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'Permission denied'
          });
        }

        const result = await templateService.searchTemplates({
          author: userId,
          limit: 100,
          sortBy: 'updated',
          sortOrder: 'desc',
        });

        res.json({
          success: true,
          data: result.templates
        });
      } catch (error: any) {
        logger.error('Error getting user templates:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Template download endpoint (serves exported files)
  router.get('/downloads/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join('./temp/templates', filename);

      // Security check - ensure file exists and is within temp directory
      if (!fs.existsSync(filePath) || !path.normalize(filePath).startsWith(path.resolve('./temp/templates'))) {
        return res.status(404).json({
          success: false,
          error: 'File not found'
        });
      }

      res.download(filePath, filename, (err) => {
        if (err) {
          logger.error('Error serving template download:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              error: 'Download failed'
            });
          }
        }
      });
    } catch (error: any) {
      logger.error('Error handling template download:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Collaboration Routes
  
  // Invite collaborator
  router.post(
    '/:id/collaborators/invite',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      body('email').optional().isEmail(),
      body('userId').optional().isInt(),
      body('permission').isIn(['view', 'edit', 'admin']).withMessage('Invalid permission'),
      body('message').optional().isString(),
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = (req as any).user.userId;
        const invite = { templateId, ...req.body };
        
        const collaborator = await collaborationService.inviteCollaborator(invite, userId);
        
        res.json({
          success: true,
          data: collaborator
        });
      } catch (error: any) {
        logger.error('Error inviting collaborator:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Accept collaboration invite
  router.post(
    '/collaborators/accept/:token',
    authenticateToken,
    [param('token').isString().withMessage('Invalid invite token')],
    validateRequest,
    async (req, res) => {
      try {
        const inviteToken = req.params.token;
        const userId = (req as any).user.userId;
        
        const collaborator = await collaborationService.acceptInvite(inviteToken, userId);
        
        res.json({
          success: true,
          data: collaborator
        });
      } catch (error: any) {
        logger.error('Error accepting invite:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get template collaborators
  router.get(
    '/:id/collaborators',
    authenticateToken,
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const collaborators = await collaborationService.getCollaborators(templateId);
        
        res.json({
          success: true,
          data: collaborators
        });
      } catch (error: any) {
        logger.error('Error fetching collaborators:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Revoke collaborator
  router.delete(
    '/:id/collaborators/:collaboratorId',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      param('collaboratorId').isInt().withMessage('Invalid collaborator ID')
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const collaboratorId = parseInt(req.params.collaboratorId);
        const userId = (req as any).user.userId;
        
        const success = await collaborationService.revokeCollaborator(templateId, collaboratorId, userId);
        
        res.json({
          success: true,
          data: { revoked: success }
        });
      } catch (error: any) {
        logger.error('Error revoking collaborator:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Add comment
  router.post(
    '/:id/comments',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      body('content').notEmpty().withMessage('Comment content is required'),
      body('type').optional().isIn(['general', 'suggestion', 'issue', 'approval', 'question']),
      body('parentId').optional().isInt(),
      body('mentions').optional().isArray()
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = (req as any).user.userId;
        
        const comment = await collaborationService.addComment({
          templateId,
          userId,
          ...req.body
        });
        
        res.json({
          success: true,
          data: comment
        });
      } catch (error: any) {
        logger.error('Error adding comment:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get template comments
  router.get(
    '/:id/comments',
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const parentId = req.query.parentId ? parseInt(req.query.parentId as string) : undefined;
        
        const comments = await collaborationService.getComments(templateId, parentId);
        
        res.json({
          success: true,
          data: comments
        });
      } catch (error: any) {
        logger.error('Error fetching comments:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Add reaction
  router.post(
    '/:id/reactions',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      body('type').isIn(['like', 'dislike', 'heart', 'thumbs_up', 'thumbs_down', 'laugh', 'confused', 'hooray', 'eyes']),
      body('commentId').optional().isInt()
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const userId = (req as any).user.userId;
        
        const reaction = await collaborationService.addReaction({
          templateId: req.body.commentId ? undefined : templateId,
          commentId: req.body.commentId,
          userId,
          type: req.body.type
        });
        
        res.json({
          success: true,
          data: reaction
        });
      } catch (error: any) {
        logger.error('Error managing reaction:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Create change request
  router.post(
    '/:id/change-requests',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      body('title').notEmpty().withMessage('Title is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('changes').isObject().withMessage('Changes object is required'),
      body('priority').optional().isIn(['low', 'medium', 'high', 'critical'])
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const requesterId = (req as any).user.userId;
        
        const changeRequest = await collaborationService.createChangeRequest({
          templateId,
          requesterId,
          ...req.body
        });
        
        res.json({
          success: true,
          data: changeRequest
        });
      } catch (error: any) {
        logger.error('Error creating change request:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Review change request
  router.post(
    '/change-requests/:requestId/review',
    authenticateToken,
    [
      param('requestId').isInt().withMessage('Invalid change request ID'),
      body('decision').isIn(['approved', 'rejected']).withMessage('Decision must be approved or rejected'),
      body('notes').optional().isString()
    ],
    validateRequest,
    async (req, res) => {
      try {
        const requestId = parseInt(req.params.requestId);
        const reviewerId = (req as any).user.userId;
        
        const changeRequest = await collaborationService.reviewChangeRequest(
          requestId, 
          reviewerId, 
          req.body.decision, 
          req.body.notes
        );
        
        res.json({
          success: true,
          data: changeRequest
        });
      } catch (error: any) {
        logger.error('Error reviewing change request:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Create discussion
  router.post(
    '/:id/discussions',
    authenticateToken,
    [
      param('id').isInt().withMessage('Invalid template ID'),
      body('title').notEmpty().withMessage('Title is required'),
      body('description').notEmpty().withMessage('Description is required'),
      body('type').optional().isIn(['general', 'feature_request', 'bug_report', 'improvement', 'question']),
      body('priority').optional().isIn(['low', 'medium', 'high']),
      body('tags').optional().isArray()
    ],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const creatorId = (req as any).user.userId;
        
        const discussion = await collaborationService.createDiscussion({
          templateId,
          creatorId,
          ...req.body
        });
        
        res.json({
          success: true,
          data: discussion
        });
      } catch (error: any) {
        logger.error('Error creating discussion:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get template discussions
  router.get(
    '/:id/discussions',
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const discussions = await collaborationService.getDiscussions(templateId);
        
        res.json({
          success: true,
          data: discussions
        });
      } catch (error: any) {
        logger.error('Error fetching discussions:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get collaboration stats
  router.get(
    '/:id/collaboration/stats',
    authenticateToken,
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const stats = await collaborationService.getCollaborationStats(templateId);
        
        res.json({
          success: true,
          data: stats
        });
      } catch (error: any) {
        logger.error('Error fetching collaboration stats:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Validation Routes
  
  // Validate template
  router.post(
    '/:id/validate',
    authenticateToken,
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        const templateId = parseInt(req.params.id);
        const template = await templateService.getTemplate(templateId);
        
        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        const analysis = await validationService.validateTemplate(template);
        
        res.json({
          success: true,
          data: analysis
        });
      } catch (error: any) {
        logger.error('Error validating template:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get validation rules
  router.get(
    '/validation/rules',
    async (req, res) => {
      try {
        const rules = validationService.getValidationRules();
        
        res.json({
          success: true,
          data: rules
        });
      } catch (error: any) {
        logger.error('Error fetching validation rules:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Enable/disable validation rule
  router.post(
    '/validation/rules/:ruleId/:action',
    authenticateToken,
    [
      param('ruleId').isString().withMessage('Rule ID is required'),
      param('action').isIn(['enable', 'disable']).withMessage('Action must be enable or disable')
    ],
    validateRequest,
    async (req, res) => {
      try {
        const { ruleId, action } = req.params;
        
        if (action === 'enable') {
          validationService.enableRule(ruleId);
        } else {
          validationService.disableRule(ruleId);
        }
        
        res.json({
          success: true,
          data: { ruleId, action }
        });
      } catch (error: any) {
        logger.error('Error toggling validation rule:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Quality check endpoint for bulk templates
  router.post(
    '/quality-check',
    authenticateToken,
    [body('templateIds').isArray().withMessage('Template IDs array is required')],
    validateRequest,
    async (req, res) => {
      try {
        const { templateIds } = req.body;
        const results = [];

        for (const templateId of templateIds) {
          try {
            const template = await templateService.getTemplate(templateId);
            if (template) {
              const analysis = await validationService.validateTemplate(template);
              results.push({
                templateId,
                qualityScore: analysis.qualityScore.overall,
                issues: analysis.issues,
                riskLevel: analysis.security.riskLevel
              });
            }
          } catch (error: any) {
            results.push({
              templateId,
              error: error.message
            });
          }
        }
        
        res.json({
          success: true,
          data: results
        });
      } catch (error: any) {
        logger.error('Error performing quality check:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Advanced Search and Discovery Routes

  // Advanced template search with facets and recommendations
  router.get(
    '/advanced-search',
    [
      query('query').optional().isString(),
      query('category').optional().isString(),
      query('subcategory').optional().isString(),
      query('tags').optional().isString(),
      query('author').optional().isString(),
      query('visibility').optional().isIn(['public', 'private', 'organization', 'shared']),
      query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']),
      query('minRating').optional().isFloat({ min: 0, max: 5 }),
      query('maxRating').optional().isFloat({ min: 0, max: 5 }),
      query('sortBy').optional().isIn(['relevance', 'rating', 'downloads', 'created', 'updated', 'popularity', 'name']),
      query('sortOrder').optional().isIn(['asc', 'desc']),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      query('offset').optional().isInt({ min: 0 })
    ],
    validateRequest,
    async (req, res) => {
      try {
        const searchQuery = {
          query: req.query.query as string,
          category: req.query.category as string,
          subcategory: req.query.subcategory as string,
          tags: req.query.tags ? (req.query.tags as string).split(',').map(t => t.trim()) : undefined,
          author: req.query.author as string,
          visibility: req.query.visibility as any,
          difficulty: req.query.difficulty as any,
          minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
          maxRating: req.query.maxRating ? parseFloat(req.query.maxRating as string) : undefined,
          sortBy: (req.query.sortBy as string) || 'relevance',
          sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
          limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
          offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
          userId: (req as any).user?.userId
        };

        const results = await searchService.searchTemplates(searchQuery);
        
        res.json({
          success: true,
          data: results
        });
      } catch (error: any) {
        logger.error('Error in advanced search:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get trending templates
  router.get(
    '/trending',
    [query('limit').optional().isInt({ min: 1, max: 50 })],
    validateRequest,
    async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const trending = await searchService.getTrendingTemplates(limit);
        
        res.json({
          success: true,
          data: trending
        });
      } catch (error: any) {
        logger.error('Error fetching trending templates:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get personalized recommendations
  router.get(
    '/recommendations',
    authenticateToken,
    [
      query('templateId').optional().isInt(),
      query('limit').optional().isInt({ min: 1, max: 20 })
    ],
    validateRequest,
    async (req, res) => {
      try {
        const userId = (req as any).user.userId;
        const templateId = req.query.templateId ? parseInt(req.query.templateId as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
        
        const recommendations = await searchService.getRecommendations(userId, templateId, limit);
        
        res.json({
          success: true,
          data: recommendations
        });
      } catch (error: any) {
        logger.error('Error fetching recommendations:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Search suggestions endpoint
  router.get(
    '/search/suggestions',
    [query('q').isString().withMessage('Query parameter q is required')],
    validateRequest,
    async (req, res) => {
      try {
        const query = req.query.q as string;
        
        // Simple implementation - in practice would use dedicated suggestion service
        const searchQuery = { query, limit: 5 };
        const results = await searchService.searchTemplates(searchQuery);
        
        const suggestions = results.suggestions || [];
        const relatedQueries = results.relatedQueries || [];
        
        res.json({
          success: true,
          data: {
            suggestions,
            relatedQueries,
            topResults: results.results.slice(0, 3).map(r => ({
              id: r.template.id,
              title: r.template.displayName || r.template.name,
              category: r.template.category
            }))
          }
        });
      } catch (error: any) {
        logger.error('Error fetching search suggestions:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Rebuild search index (admin only)
  router.post(
    '/search/rebuild-index',
    authenticateToken,
    async (req, res) => {
      try {
        // Check if user has admin permissions
        const userRole = (req as any).user?.role;
        if (userRole !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'Admin permissions required'
          });
        }

        const result = await searchService.rebuildIndex();
        
        res.json({
          success: true,
          data: {
            message: 'Search index rebuild completed',
            ...result
          }
        });
      } catch (error: any) {
        logger.error('Error rebuilding search index:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Index specific template (admin only)
  router.post(
    '/:id/index',
    authenticateToken,
    [param('id').isInt().withMessage('Invalid template ID')],
    validateRequest,
    async (req, res) => {
      try {
        // Check if user has admin permissions
        const userRole = (req as any).user?.role;
        if (userRole !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'Admin permissions required'
          });
        }

        const templateId = parseInt(req.params.id);
        const template = await templateService.getTemplate(templateId);
        
        if (!template) {
          return res.status(404).json({
            success: false,
            error: 'Template not found'
          });
        }

        await searchService.indexTemplate(template);
        
        res.json({
          success: true,
          data: {
            message: `Template ${templateId} indexed successfully`
          }
        });
      } catch (error: any) {
        logger.error('Error indexing template:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Get search analytics
  router.get(
    '/search/analytics',
    authenticateToken,
    async (req, res) => {
      try {
        // Check if user has admin permissions
        const userRole = (req as any).user?.role;
        if (userRole !== 'admin') {
          return res.status(403).json({
            success: false,
            error: 'Admin permissions required'
          });
        }

        // This would integrate with analytics service to provide search insights
        const analytics = {
          totalSearches: 0,
          popularQueries: [],
          searchTrends: [],
          conversionRates: {},
          avgSearchTime: 0
        };
        
        res.json({
          success: true,
          data: analytics
        });
      } catch (error: any) {
        logger.error('Error fetching search analytics:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }
  );

  // Health check for template service
  router.get('/health', async (req, res) => {
    try {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: 'templates'
        }
      });
    } catch (error: any) {
      res.status(503).json({
        success: false,
        data: {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
          service: 'templates'
        }
      });
    }
  });

  return router;
}

// Create default instance with initialized services
import { db } from '../config/database';
import { TemplateAnalyticsService } from '../services/TemplateAnalyticsService';

const templateService = new WorkflowTemplateService(db.getSequelize());
const importExportService = new TemplateImportExportService(templateService);
const collaborationService = new TemplateCollaborationService(db.getSequelize(), templateService);
const validationService = new TemplateValidationService();
const analyticsService = new TemplateAnalyticsService(db.getSequelize());
const searchService = new TemplateSearchService(db.getSequelize(), templateService, analyticsService);

export default createTemplateRoutes(templateService, importExportService, collaborationService, validationService, searchService);