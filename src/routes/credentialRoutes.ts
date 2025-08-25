import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { credentialStorageService } from '../services/CredentialStorageService';
import { createLogger } from '../utils/logger';

const router = Router();
const logger = createLogger('CredentialRoutes');

// Get all credential types
router.get('/types', authenticate, async (req: Request, res: Response) => {
  try {
    const types = credentialStorageService.getCredentialTypes();
    
    res.json({
      status: 'success',
      data: types
    });
  } catch (error) {
    logger.error('Failed to get credential types:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve credential types'
    });
  }
});

// Get specific credential type definition
router.get('/types/:type', authenticate, async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const credentialType = credentialStorageService.getCredentialType(type);
    
    if (!credentialType) {
      return res.status(404).json({
        status: 'error',
        message: 'Credential type not found'
      });
    }
    
    res.json({
      status: 'success',
      data: credentialType
    });
  } catch (error) {
    logger.error('Failed to get credential type:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve credential type'
    });
  }
});

// List user's credentials
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { type, tags, isShared } = req.query;
    
    const filters: any = {};
    if (type) filters.type = type as string;
    if (tags) filters.tags = (tags as string).split(',');
    if (isShared !== undefined) filters.isShared = isShared === 'true';
    
    const credentials = await credentialStorageService.listCredentials(userId, filters);
    
    // Remove encrypted data from response
    const safeCredentials = credentials.map(cred => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      description: cred.description,
      isShared: cred.isShared,
      sharedWith: cred.sharedWith,
      permissions: cred.permissions,
      lastUsed: cred.lastUsed,
      validatedAt: cred.validatedAt,
      isValid: cred.isValid,
      tags: cred.tags,
      metadata: cred.metadata,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt
    }));
    
    res.json({
      status: 'success',
      data: safeCredentials
    });
  } catch (error) {
    logger.error('Failed to list credentials:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve credentials'
    });
  }
});

// Create new credential
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { name, type, data, description, tags } = req.body;
    
    if (!name || !type || !data) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, type, and data are required'
      });
    }
    
    const credential = await credentialStorageService.createCredential(
      userId,
      name,
      type,
      data,
      description,
      tags
    );
    
    // Remove encrypted data from response
    const safeCredential = {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      description: credential.description,
      isShared: credential.isShared,
      isValid: credential.isValid,
      tags: credential.tags,
      metadata: credential.metadata,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    };
    
    res.status(201).json({
      status: 'success',
      data: safeCredential,
      message: 'Credential created successfully'
    });
  } catch (error: any) {
    logger.error('Failed to create credential:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to create credential'
    });
  }
});

// Get specific credential (without sensitive data)
router.get('/:credentialId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    
    const credential = await credentialStorageService.getCredential(credentialId, userId);
    
    if (!credential) {
      return res.status(404).json({
        status: 'error',
        message: 'Credential not found or access denied'
      });
    }
    
    // Remove encrypted data from response
    const safeCredential = {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      description: credential.description,
      isShared: credential.isShared,
      sharedWith: credential.sharedWith,
      permissions: credential.permissions,
      lastUsed: credential.lastUsed,
      validatedAt: credential.validatedAt,
      isValid: credential.isValid,
      tags: credential.tags,
      metadata: credential.metadata,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    };
    
    res.json({
      status: 'success',
      data: safeCredential
    });
  } catch (error) {
    logger.error('Failed to get credential:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve credential'
    });
  }
});

// Update credential
router.put('/:credentialId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    const updates = req.body;
    
    const credential = await credentialStorageService.updateCredential(
      credentialId,
      userId,
      updates
    );
    
    // Remove encrypted data from response
    const safeCredential = {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      description: credential.description,
      isShared: credential.isShared,
      isValid: credential.isValid,
      tags: credential.tags,
      metadata: credential.metadata,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    };
    
    res.json({
      status: 'success',
      data: safeCredential,
      message: 'Credential updated successfully'
    });
  } catch (error: any) {
    logger.error('Failed to update credential:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to update credential'
    });
  }
});

// Delete credential
router.delete('/:credentialId', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    
    const success = await credentialStorageService.deleteCredential(credentialId, userId);
    
    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: 'Credential not found or access denied'
      });
    }
    
    res.json({
      status: 'success',
      message: 'Credential deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete credential:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete credential'
    });
  }
});

// Test credential
router.post('/:credentialId/test', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    
    // Check if user has access to this credential
    const credential = await credentialStorageService.getCredential(credentialId, userId);
    if (!credential) {
      return res.status(404).json({
        status: 'error',
        message: 'Credential not found or access denied'
      });
    }
    
    const testResult = await credentialStorageService.testCredential(credentialId);
    
    res.json({
      status: 'success',
      data: testResult
    });
  } catch (error) {
    logger.error('Failed to test credential:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test credential'
    });
  }
});

// Test credential data (without saving)
router.post('/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    
    if (!type || !data) {
      return res.status(400).json({
        status: 'error',
        message: 'Type and data are required'
      });
    }
    
    // Create a temporary credential for testing
    const tempCredential = {
      id: 'temp',
      type,
      encryptedData: JSON.stringify(data), // Not actually encrypted for temp test
    };
    
    // Test based on type (simplified version)
    let testResult;
    switch (type) {
      case 'api_key':
        testResult = await credentialStorageService['testApiKey'](data);
        break;
      case 'basic_auth':
        testResult = await credentialStorageService['testBasicAuth'](data);
        break;
      case 'database':
        testResult = await credentialStorageService['testDatabase'](data);
        break;
      case 'ssh':
        testResult = await credentialStorageService['testSSH'](data);
        break;
      case 'oauth2':
        testResult = await credentialStorageService['testOAuth2'](data);
        break;
      case 'aws':
        testResult = await credentialStorageService['testAWS'](data);
        break;
      default:
        testResult = { success: false, message: 'Test not available for this credential type' };
    }
    
    res.json({
      status: 'success',
      data: testResult
    });
  } catch (error: any) {
    logger.error('Failed to test credential data:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to test credential data'
    });
  }
});

// Share credential with other users
router.post('/:credentialId/share', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    const { userIds, permissions = ['read', 'use'] } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'userIds array is required'
      });
    }
    
    const credential = await credentialStorageService.shareCredential(
      credentialId,
      userId,
      userIds,
      permissions
    );
    
    res.json({
      status: 'success',
      message: `Credential shared with ${userIds.length} users`,
      data: {
        credentialId: credential.id,
        sharedWith: credential.sharedWith,
        permissions: credential.permissions
      }
    });
  } catch (error: any) {
    logger.error('Failed to share credential:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to share credential'
    });
  }
});

// Unshare credential
router.delete('/:credentialId/share', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    
    const credential = await credentialStorageService.shareCredential(
      credentialId,
      userId,
      [], // Empty array to unshare
      []
    );
    
    // Update to not shared
    await credentialStorageService.updateCredential(credentialId, userId, {});
    
    res.json({
      status: 'success',
      message: 'Credential unshared successfully'
    });
  } catch (error: any) {
    logger.error('Failed to unshare credential:', error);
    res.status(400).json({
      status: 'error',
      message: error.message || 'Failed to unshare credential'
    });
  }
});

// Get decrypted credential data (for authorized use in workflows)
router.get('/:credentialId/decrypt', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    
    // This endpoint should be used carefully and only by authorized workflow engines
    // In production, you might want to add additional authorization checks
    
    const decryptedData = await credentialStorageService.getDecryptedCredential(credentialId, userId);
    
    if (!decryptedData) {
      return res.status(404).json({
        status: 'error',
        message: 'Credential not found or access denied'
      });
    }
    
    res.json({
      status: 'success',
      data: decryptedData
    });
  } catch (error) {
    logger.error('Failed to decrypt credential:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to decrypt credential'
    });
  }
});

// Get credential usage statistics
router.get('/:credentialId/stats', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { credentialId } = req.params;
    
    const credential = await credentialStorageService.getCredential(credentialId, userId);
    
    if (!credential) {
      return res.status(404).json({
        status: 'error',
        message: 'Credential not found or access denied'
      });
    }
    
    // Basic stats - in a real implementation, you might track more detailed usage
    const stats = {
      credentialId: credential.id,
      name: credential.name,
      type: credential.type,
      lastUsed: credential.lastUsed,
      validatedAt: credential.validatedAt,
      isValid: credential.isValid,
      isShared: credential.isShared,
      sharedWithCount: credential.sharedWith?.length || 0,
      createdAt: credential.createdAt,
      ageInDays: Math.floor((Date.now() - credential.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };
    
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get credential stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve credential statistics'
    });
  }
});

export default router;