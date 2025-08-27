// Simple test to verify DataExportService works
const { DataExportService } = require('./dist/services/DataExportService.js');
const fs = require('fs');
const path = require('path');

async function testExport() {
  try {
    console.log('Testing DataExportService...');
    
    const exportService = DataExportService.getInstance();
    
    // Test data
    const testData = [
      { id: 1, name: 'Test Item 1', value: 100 },
      { id: 2, name: 'Test Item 2', value: 200 },
      { id: 3, name: 'Test Item 3', value: 300 }
    ];
    
    // Test Excel export
    console.log('Testing Excel export...');
    const result = await exportService.exportToExcel(testData, {
      format: 'xlsx',
      fileName: 'test_export.xlsx',
      headers: ['id', 'name', 'value']
    });
    
    console.log('Export result:', result);
    
    // Check if file exists
    if (result.success && result.filePath) {
      const fileExists = fs.existsSync(result.filePath);
      console.log('File exists:', fileExists);
      if (fileExists) {
        const stats = fs.statSync(result.filePath);
        console.log('File size:', stats.size, 'bytes');
        
        // Clean up
        fs.unlinkSync(result.filePath);
        console.log('Test file cleaned up');
      }
    }
    
    console.log('DataExportService test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testExport();