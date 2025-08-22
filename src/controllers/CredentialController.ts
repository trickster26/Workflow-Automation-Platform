import { Request, Response } from 'express';
import { credentialService } from '../services/CredentialService';
import { createLogger } from '../utils/logger';

const logger = createLogger('CredentialController');

export class CredentialController {
  // Get all credential types
  public static async getCredentialTypes(req: Request, res: Response): Promise<void> {
    try {
      const credentialTypes = credentialService.getAllCredentialTypes();
      res.json(credentialTypes);
    } catch (error: any) {
      logger.error('Error fetching credential types:', error);
      res.status(500).json({ error: 'Failed to fetch credential types' });
    }
  }

  // Get specific credential type
  public static async getCredentialType(req: Request, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const credentialType = credentialService.getCredentialType(type);
      
      if (!credentialType) {
        return res.status(404).json({ error: 'Credential type not found' });
      }
      
      res.json(credentialType);
    } catch (error: any) {
      logger.error('Error fetching credential type:', error);
      res.status(500).json({ error: 'Failed to fetch credential type' });
    }
  }

  // Get user credentials
  public static async getUserCredentials(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id; // Assuming user is attached by auth middleware
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const credentials = await credentialService.getUserCredentials(userId);
      res.json(credentials);
    } catch (error: any) {
      logger.error('Error fetching user credentials:', error);
      res.status(500).json({ error: 'Failed to fetch credentials' });
    }
  }

  // Create credential
  public static async createCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const { name, type, data } = req.body;
      
      if (!name || !type || !data) {
        return res.status(400).json({ 
          error: 'Name, type, and data are required' 
        });
      }
      
      const credential = await credentialService.createCredential(name, type, data, userId);
      res.status(201).json(credential);
    } catch (error: any) {
      logger.error('Error creating credential:', error);
      res.status(400).json({ error: error.message });
    }
  }

  // Update credential
  public static async updateCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { credentialId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const credential = await credentialService.updateCredential(
        credentialId, 
        req.body, 
        userId
      );
      
      res.json(credential);
    } catch (error: any) {
      logger.error('Error updating credential:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message });
      }
    }
  }

  // Delete credential
  public static async deleteCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { credentialId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      await credentialService.deleteCredential(credentialId, userId);
      res.status(204).send();
    } catch (error: any) {
      logger.error('Error deleting credential:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Failed to delete credential' });
      }
    }
  }

  // Test credential
  public static async testCredential(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body;
      
      if (!type || !data) {
        return res.status(400).json({ 
          error: 'Type and data are required for testing' 
        });
      }
      
      const testResult = await credentialService.testCredential(type, data);
      res.json(testResult);
    } catch (error: any) {
      logger.error('Error testing credential:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to test credential' 
      });
    }
  }

  // Test existing credential
  public static async testExistingCredential(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { credentialId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get credential data (this will be encrypted)
      const credentialData = await credentialService.getCredential(credentialId, userId);
      
      // We need to also get the credential type to test it
      // For now, we'll return a basic success response
      res.json({ 
        success: true, 
        message: 'Credential test not implemented for existing credentials' 
      });
    } catch (error: any) {
      logger.error('Error testing existing credential:', error);
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Failed to test credential' 
        });
      }
    }
  }
}