import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { advancedTransformService } from '../services/AdvancedTransformService';
import { dataTransformValidationService } from '../services/DataTransformValidationService';
import { dataCleansingService } from '../services/DataCleansingService';
import { createLogger } from '../utils/logger';
import joi from 'joi';

const router = Router();
const logger = createLogger('TransformationRoutes');

// Validation schemas
const transformRequestSchema = joi.object({
  data: joi.any().required(),
  operations: joi.array().items(joi.object({
    id: joi.string().required(),
    type: joi.string().valid(
      'jsonpath', 'lodash', 'javascript', 'math', 'template', 
      'mapping', 'filter', 'sort', 'group', 'aggregate'
    ).required(),
    description: joi.string().required(),
    config: joi.object().required(),
    enabled: joi.boolean().default(true)
  })).required()
});

const validationRequestSchema = joi.object({
  data: joi.any().required(),
  rules: joi.array().items(joi.object({
    id: joi.string().required(),
    name: joi.string().required(),
    type: joi.string().valid(
      'joi', 'ajv', 'custom', 'regex', 'range', 'length', 
      'required', 'unique', 'reference'
    ).required(),
    field: joi.string().optional(),
    config: joi.object().required(),
    errorMessage: joi.string().optional(),
    severity: joi.string().valid('error', 'warning', 'info').default('error'),
    enabled: joi.boolean().default(true)
  })).required()
});

const cleansingRequestSchema = joi.object({
  data: joi.any().required(),
  rules: joi.array().items(joi.object({
    id: joi.string().required(),
    name: joi.string().required(),
    type: joi.string().valid(
      'deduplicate', 'normalize', 'standardize', 'trim', 
      'replace', 'remove', 'format', 'validate'
    ).required(),
    field: joi.string().optional(),
    config: joi.object().required(),
    enabled: joi.boolean().default(true)
  })).required()
});

// Transform data
router.post('/transform', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = transformRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details
      });
    }

    const { data, operations } = value;
    const result = await advancedTransformService.transformData(data, operations);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Data transformation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Data transformation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test transformation with sample data
router.post('/transform/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { operations, sampleData } = req.body;

    if (!operations || !sampleData) {
      return res.status(400).json({
        status: 'error',
        message: 'Operations and sampleData are required'
      });
    }

    const result = await advancedTransformService.testTransformation(operations, sampleData);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Transformation test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Transformation test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get transformation templates
router.get('/transform/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const templates = await advancedTransformService.getTransformationTemplates();

    res.json({
      status: 'success',
      data: {
        templates,
        total: templates.length
      }
    });
  } catch (error) {
    logger.error('Failed to get transformation templates:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get transformation templates'
    });
  }
});

// Validate data
router.post('/validate', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = validationRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details
      });
    }

    const { data, rules } = value;
    const result = await dataTransformValidationService.validateData(data, rules);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Data validation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Data validation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Schema validation
router.post('/validate/schema', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, schemaType, schema, options } = req.body;

    if (!data || !schemaType || !schema) {
      return res.status(400).json({
        status: 'error',
        message: 'data, schemaType, and schema are required'
      });
    }

    const result = await dataTransformValidationService.validateWithSchema(data, {
      type: schemaType,
      schema,
      options: options || {}
    });

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Schema validation failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Schema validation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Data quality analysis
router.post('/validate/quality', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, fields } = req.body;

    if (!Array.isArray(data)) {
      return res.status(400).json({
        status: 'error',
        message: 'Data must be an array for quality analysis'
      });
    }

    const result = await dataTransformValidationService.analyzeDataQuality(data, fields);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Data quality analysis failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Data quality analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Cleanse data
router.post('/cleanse', authenticate, async (req: Request, res: Response) => {
  try {
    const { error, value } = cleansingRequestSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        details: error.details
      });
    }

    const { data, rules } = value;
    const result = await dataCleansingService.cleanseData(data, rules);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Data cleansing failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Data cleansing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enrich data
router.post('/enrich', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, enrichmentConfigs } = req.body;

    if (!data || !enrichmentConfigs) {
      return res.status(400).json({
        status: 'error',
        message: 'data and enrichmentConfigs are required'
      });
    }

    const result = await dataCleansingService.enrichData(data, enrichmentConfigs);

    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    logger.error('Data enrichment failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Data enrichment failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Validation rule management
router.post('/validate/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const ruleData = req.body;
    const ruleId = await dataTransformValidationService.createValidationRule(ruleData);

    res.status(201).json({
      status: 'success',
      data: {
        ruleId,
        message: 'Validation rule created successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to create validation rule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create validation rule'
    });
  }
});

router.get('/validate/rules', authenticate, async (req: Request, res: Response) => {
  try {
    const rules = await dataTransformValidationService.listValidationRules();

    res.json({
      status: 'success',
      data: {
        rules,
        total: rules.length
      }
    });
  } catch (error) {
    logger.error('Failed to list validation rules:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list validation rules'
    });
  }
});

router.get('/validate/rules/:ruleId', authenticate, async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = await dataTransformValidationService.getValidationRule(ruleId);

    if (!rule) {
      return res.status(404).json({
        status: 'error',
        message: 'Validation rule not found'
      });
    }

    res.json({
      status: 'success',
      data: rule
    });
  } catch (error) {
    logger.error('Failed to get validation rule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get validation rule'
    });
  }
});

// Quality check management
router.post('/validate/checks', authenticate, async (req: Request, res: Response) => {
  try {
    const checkData = req.body;
    const checkId = await dataTransformValidationService.createQualityCheck(checkData);

    res.status(201).json({
      status: 'success',
      data: {
        checkId,
        message: 'Quality check created successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to create quality check:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create quality check'
    });
  }
});

router.get('/validate/checks', authenticate, async (req: Request, res: Response) => {
  try {
    const checks = await dataTransformValidationService.listQualityChecks();

    res.json({
      status: 'success',
      data: {
        checks,
        total: checks.length
      }
    });
  } catch (error) {
    logger.error('Failed to list quality checks:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to list quality checks'
    });
  }
});

router.get('/validate/checks/:checkId', authenticate, async (req: Request, res: Response) => {
  try {
    const { checkId } = req.params;
    const check = await dataTransformValidationService.getQualityCheck(checkId);

    if (!check) {
      return res.status(404).json({
        status: 'error',
        message: 'Quality check not found'
      });
    }

    res.json({
      status: 'success',
      data: check
    });
  } catch (error) {
    logger.error('Failed to get quality check:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get quality check'
    });
  }
});

// Combined transformation pipeline
router.post('/pipeline', authenticate, async (req: Request, res: Response) => {
  try {
    const { data, pipeline } = req.body;

    if (!data || !pipeline || !Array.isArray(pipeline)) {
      return res.status(400).json({
        status: 'error',
        message: 'data and pipeline array are required'
      });
    }

    let currentData = data;
    const results = [];

    for (const step of pipeline) {
      const { type, config } = step;
      let stepResult;

      switch (type) {
        case 'transform':
          stepResult = await advancedTransformService.transformData(currentData, config.operations);
          currentData = stepResult.data;
          break;
        case 'validate':
          stepResult = await dataTransformValidationService.validateData(currentData, config.rules);
          break;
        case 'cleanse':
          stepResult = await dataCleansingService.cleanseData(currentData, config.rules);
          currentData = stepResult.data;
          break;
        case 'enrich':
          stepResult = await dataCleansingService.enrichData(currentData, config.enrichmentConfigs);
          currentData = stepResult;
          break;
        default:
          throw new Error(`Unknown pipeline step type: ${type}`);
      }

      results.push({
        step: type,
        result: stepResult,
        data: currentData
      });
    }

    res.json({
      status: 'success',
      data: {
        finalData: currentData,
        pipeline: results
      }
    });
  } catch (error) {
    logger.error('Pipeline execution failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Pipeline execution failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get supported operations and their schemas
router.get('/operations', authenticate, async (req: Request, res: Response) => {
  try {
    const operations = {
      transform: {
        types: ['jsonpath', 'lodash', 'javascript', 'math', 'template', 'mapping', 'filter', 'sort', 'group', 'aggregate'],
        description: 'Transform data using various operations'
      },
      validate: {
        types: ['joi', 'ajv', 'custom', 'regex', 'range', 'length', 'required', 'unique', 'reference'],
        description: 'Validate data against rules and schemas'
      },
      cleanse: {
        types: ['deduplicate', 'normalize', 'standardize', 'trim', 'replace', 'remove', 'format', 'validate'],
        description: 'Clean and standardize data'
      },
      enrich: {
        types: ['lookup', 'calculation', 'geocoding', 'validation', 'categorization'],
        description: 'Enhance data with additional information'
      }
    };

    res.json({
      status: 'success',
      data: operations
    });
  } catch (error) {
    logger.error('Failed to get operations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get operations'
    });
  }
});

// Health check for transformation services
router.get('/health', authenticate, async (req: Request, res: Response) => {
  try {
    // Test basic functionality of each service
    const testData = { test: 'data' };
    
    // Test transform service
    const transformResult = await advancedTransformService.transformData(testData, [{
      id: 'test',
      type: 'template',
      description: 'Test template',
      config: { template: 'Test: {{test}}' },
      enabled: true
    }]);

    // Test validation service
    const validationResult = await dataTransformValidationService.validateData(testData, [{
      id: 'test',
      name: 'Test rule',
      type: 'required',
      field: 'test',
      config: {},
      severity: 'error',
      enabled: true
    }]);

    // Test cleansing service
    const cleansingResult = await dataCleansingService.cleanseData(testData, [{
      id: 'test',
      name: 'Test cleansing',
      type: 'trim',
      config: {},
      enabled: true
    }]);

    res.json({
      status: 'success',
      data: {
        services: {
          transform: transformResult.success,
          validation: validationResult.valid,
          cleansing: cleansingResult.success
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;