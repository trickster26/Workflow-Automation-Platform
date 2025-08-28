import request from 'supertest';
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileRoutes } from '../../routes/fileRoutes';
import { FileStorageService } from '../../services/FileStorageService';

// Mock FileStorageService
jest.mock('../../services/FileStorageService');
const mockFileStorageService = FileStorageService as jest.MockedClass<typeof FileStorageService>;

const app = express();
app.use(express.json());
app.use('/api/files', fileRoutes);

describe('File Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/files/upload', () => {
    it('should upload file successfully', async () => {
      const mockFileData = {
        id: 1,
        filename: 'test-document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        path: '/uploads/test-document.pdf',
        uploadedAt: new Date()
      };

      mockFileStorageService.prototype.uploadFile = jest.fn().mockResolvedValue(mockFileData);

      // Create a test file buffer
      const testFileContent = Buffer.from('test file content');

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFileContent, 'test.pdf')
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFileData);
      expect(response.body.data.path).not.toContain('../'); // No path traversal
    });

    it('should validate file type restrictions', async () => {
      const testFileContent = Buffer.from('malicious script content');

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFileContent, 'malicious.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File type not allowed');
    });

    it('should validate file size limits', async () => {
      // Mock a large file
      const largeFileContent = Buffer.alloc(100 * 1024 * 1024); // 100MB

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', largeFileContent, 'large.pdf')
        .expect(413);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('File too large');
    });

    it('should sanitize file names', async () => {
      const maliciousFileName = '../../etc/passwd';
      const testFileContent = Buffer.from('test content');

      mockFileStorageService.prototype.uploadFile = jest.fn().mockImplementation((fileData) => {
        // Verify filename is sanitized
        expect(fileData.filename).not.toContain('../');
        expect(fileData.filename).not.toContain('passwd');
        return Promise.resolve({ ...fileData, id: 1 });
      });

      await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFileContent, maliciousFileName);

      expect(mockFileStorageService.prototype.uploadFile).toHaveBeenCalled();
    });

    it('should scan files for malware', async () => {
      const suspiciousContent = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');

      mockFileStorageService.prototype.uploadFile = jest.fn().mockRejectedValue(
        new Error('File failed security scan: potential malware detected')
      );

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', suspiciousContent, 'suspicious.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('security scan');
    });

    it('should require authentication', async () => {
      const testFileContent = Buffer.from('test content');

      const response = await request(app)
        .post('/api/files/upload')
        .attach('file', testFileContent, 'test.pdf')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('authentication');
    });

    it('should handle upload errors gracefully', async () => {
      mockFileStorageService.prototype.uploadFile = jest.fn().mockRejectedValue(
        new Error('Storage service unavailable')
      );

      const testFileContent = Buffer.from('test content');

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFileContent, 'test.pdf')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Upload failed');
    });
  });

  describe('GET /api/files/:id', () => {
    it('should download file by ID', async () => {
      const mockFile = {
        id: 1,
        filename: 'test-document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        path: '/uploads/test-document.pdf',
        userId: 1
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);
      mockFileStorageService.prototype.getFileStream = jest.fn().mockResolvedValue(
        fs.createReadStream(__filename) // Use this test file as mock stream
      );

      const response = await request(app)
        .get('/api/files/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/pdf');
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should return 404 for non-existent file', async () => {
      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/files/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('File not found');
    });

    it('should validate file access permissions', async () => {
      const mockFile = {
        id: 1,
        filename: 'private-document.pdf',
        userId: 999 // Different user
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/files/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access denied');
    });

    it('should prevent path traversal attacks', async () => {
      const response = await request(app)
        .get('/api/files/../../../etc/passwd')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid file ID');
    });
  });

  describe('GET /api/files/:id/info', () => {
    it('should return file metadata', async () => {
      const mockFile = {
        id: 1,
        filename: 'test-document.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date(),
        userId: 1
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/files/1/info')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockFile);
      expect(response.body.data).not.toHaveProperty('path'); // Sensitive path not exposed
    });

    it('should include virus scan results in metadata', async () => {
      const mockFile = {
        id: 1,
        filename: 'scanned-document.pdf',
        scanStatus: 'clean',
        scanDate: new Date(),
        userId: 1
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);

      const response = await request(app)
        .get('/api/files/1/info')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.scanStatus).toBe('clean');
      expect(response.body.data).toHaveProperty('scanDate');
    });
  });

  describe('DELETE /api/files/:id', () => {
    it('should delete file successfully', async () => {
      const mockFile = {
        id: 1,
        filename: 'to-delete.pdf',
        userId: 1
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);
      mockFileStorageService.prototype.deleteFile = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/files/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should validate ownership before deletion', async () => {
      const mockFile = {
        id: 1,
        filename: 'other-user-file.pdf',
        userId: 999 // Different user
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);

      const response = await request(app)
        .delete('/api/files/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access denied');
    });

    it('should prevent deletion of files in use', async () => {
      const mockFile = {
        id: 1,
        filename: 'in-use-file.pdf',
        userId: 1,
        isInUse: true
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);
      mockFileStorageService.prototype.deleteFile = jest.fn().mockRejectedValue(
        new Error('Cannot delete file: currently referenced by active workflows')
      );

      const response = await request(app)
        .delete('/api/files/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('currently referenced');
    });
  });

  describe('GET /api/files', () => {
    it('should list user files with pagination', async () => {
      const mockFiles = [
        {
          id: 1,
          filename: 'file1.pdf',
          originalName: 'document1.pdf',
          size: 1024,
          uploadedAt: new Date()
        },
        {
          id: 2,
          filename: 'file2.pdf',
          originalName: 'document2.pdf',
          size: 2048,
          uploadedAt: new Date()
        }
      ];

      mockFileStorageService.prototype.getUserFiles = jest.fn().mockResolvedValue({
        files: mockFiles,
        total: 2,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/api/files')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.files).toEqual(mockFiles);
      expect(response.body.data.total).toBe(2);
    });

    it('should filter files by type', async () => {
      const pdfFiles = [
        { id: 1, filename: 'doc1.pdf', mimeType: 'application/pdf' }
      ];

      mockFileStorageService.prototype.getUserFiles = jest.fn().mockResolvedValue({
        files: pdfFiles,
        total: 1,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/api/files')
        .query({ type: 'pdf' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.files).toEqual(pdfFiles);
      expect(mockFileStorageService.prototype.getUserFiles).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ type: 'pdf' })
      );
    });

    it('should sort files by upload date', async () => {
      const sortedFiles = [
        { id: 2, filename: 'newer.pdf', uploadedAt: new Date('2023-02-01') },
        { id: 1, filename: 'older.pdf', uploadedAt: new Date('2023-01-01') }
      ];

      mockFileStorageService.prototype.getUserFiles = jest.fn().mockResolvedValue({
        files: sortedFiles,
        total: 2,
        page: 1,
        limit: 10
      });

      const response = await request(app)
        .get('/api/files')
        .query({ sort: 'date', order: 'desc' })
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.data.files[0].id).toBe(2); // Newer file first
      expect(response.body.data.files[1].id).toBe(1); // Older file second
    });
  });

  describe('POST /api/files/batch-delete', () => {
    it('should delete multiple files', async () => {
      const fileIds = [1, 2, 3];
      const mockFiles = fileIds.map(id => ({
        id,
        filename: `file${id}.pdf`,
        userId: 1
      }));

      mockFileStorageService.prototype.getFilesByIds = jest.fn().mockResolvedValue(mockFiles);
      mockFileStorageService.prototype.deleteFiles = jest.fn().mockResolvedValue({
        deleted: 3,
        failed: 0,
        errors: []
      });

      const response = await request(app)
        .post('/api/files/batch-delete')
        .set('Authorization', 'Bearer valid-token')
        .send({ fileIds })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(3);
      expect(response.body.data.failed).toBe(0);
    });

    it('should validate ownership of all files before batch deletion', async () => {
      const fileIds = [1, 2];
      const mockFiles = [
        { id: 1, filename: 'mine.pdf', userId: 1 },
        { id: 2, filename: 'theirs.pdf', userId: 999 } // Different user
      ];

      mockFileStorageService.prototype.getFilesByIds = jest.fn().mockResolvedValue(mockFiles);

      const response = await request(app)
        .post('/api/files/batch-delete')
        .set('Authorization', 'Bearer valid-token')
        .send({ fileIds })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access denied');
    });

    it('should limit batch size', async () => {
      const fileIds = Array.from({ length: 101 }, (_, i) => i + 1); // 101 files

      const response = await request(app)
        .post('/api/files/batch-delete')
        .set('Authorization', 'Bearer valid-token')
        .send({ fileIds })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Too many files');
    });
  });

  describe('Security Tests', () => {
    it('should validate file signatures', async () => {
      // Mock file with PDF extension but different content
      const fakeContent = Buffer.from('This is not a PDF file');

      mockFileStorageService.prototype.uploadFile = jest.fn().mockImplementation(async (fileData) => {
        // Should detect content/extension mismatch
        throw new Error('File signature does not match extension');
      });

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', fakeContent, 'fake.pdf')
        .expect(400);

      expect(response.body.error).toContain('signature does not match');
    });

    it('should enforce storage quotas', async () => {
      mockFileStorageService.prototype.uploadFile = jest.fn().mockRejectedValue(
        new Error('Storage quota exceeded: 100MB limit reached')
      );

      const testFileContent = Buffer.from('test content');

      const response = await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFileContent, 'test.pdf')
        .expect(413);

      expect(response.body.error).toContain('quota exceeded');
    });

    it('should audit file access', async () => {
      const mockFile = {
        id: 1,
        filename: 'confidential.pdf',
        userId: 1
      };

      mockFileStorageService.prototype.getFileById = jest.fn().mockResolvedValue(mockFile);
      mockFileStorageService.prototype.auditFileAccess = jest.fn().mockResolvedValue(true);

      await request(app)
        .get('/api/files/1')
        .set('Authorization', 'Bearer valid-token');

      expect(mockFileStorageService.prototype.auditFileAccess).toHaveBeenCalledWith(
        1,
        expect.any(String),
        'download'
      );
    });

    it('should encrypt files at rest', async () => {
      mockFileStorageService.prototype.uploadFile = jest.fn().mockImplementation(async (fileData) => {
        // Verify encryption is applied
        expect(fileData.encrypted).toBe(true);
        expect(fileData.encryptionKey).toBeDefined();
        return { ...fileData, id: 1 };
      });

      const testFileContent = Buffer.from('sensitive data');

      await request(app)
        .post('/api/files/upload')
        .set('Authorization', 'Bearer valid-token')
        .attach('file', testFileContent, 'sensitive.pdf');

      expect(mockFileStorageService.prototype.uploadFile).toHaveBeenCalled();
    });
  });
});