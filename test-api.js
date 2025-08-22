#!/usr/bin/env node

/**
 * API Test Script for Workflow Automation Platform
 * Tests basic functionality of API endpoints and webhook system
 */

const http = require('http');
const https = require('https');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Test helper function
async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'https:' ? https : http;
    
    const req = lib.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: jsonBody,
            rawBody: body,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
          });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

// Parse URL
function parseUrl(url) {
  const parsed = new URL(url);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
  };
}

// Test functions
async function testHealthCheck() {
  console.log('\n🔍 Testing health check...');
  
  try {
    const options = {
      ...parseUrl(`${API_BASE}/health`),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ Health check passed');
      console.log('📊 System status:', response.body.status);
      console.log('🕐 Uptime:', Math.round((response.body.services?.execution?.activeExecutions || 0)), 'active executions');
    } else {
      console.log('❌ Health check failed:', response.statusCode);
      console.log('Error:', response.body);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
}

async function testApiInfo() {
  console.log('\n📋 Testing API info...');
  
  try {
    const options = {
      ...parseUrl(`${API_BASE}/api/info`),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ API info retrieved');
      console.log('📖 API Name:', response.body.name);
      console.log('🔢 Version:', response.body.version);
      console.log('🔗 Available endpoints:', Object.keys(response.body.endpoints || {}).length);
    } else {
      console.log('❌ API info failed:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ API info error:', error.message);
  }
}

async function testNodeTypes() {
  console.log('\n🧩 Testing node types...');
  
  try {
    const options = {
      ...parseUrl(`${API_BASE}/api/node-types`),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const nodeTypes = Array.isArray(response.body) ? response.body : [];
      console.log('✅ Node types retrieved');
      console.log('🧩 Total node types:', nodeTypes.length);
      
      if (nodeTypes.length > 0) {
        console.log('📝 Sample types:', nodeTypes.slice(0, 3).map(n => n.name || n.type).join(', '));
      }
    } else {
      console.log('❌ Node types failed:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Node types error:', error.message);
  }
}

async function testWorkflows() {
  console.log('\n📊 Testing workflows...');
  
  try {
    const options = {
      ...parseUrl(`${API_BASE}/api/workflows`),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const workflows = Array.isArray(response.body) ? response.body : [];
      console.log('✅ Workflows retrieved');
      console.log('📊 Total workflows:', workflows.length);
    } else {
      console.log('❌ Workflows failed:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Workflows error:', error.message);
  }
}

async function testCreateWorkflow() {
  console.log('\n🆕 Testing workflow creation...');
  
  try {
    const workflowData = {
      name: 'Test API Workflow',
      description: 'A test workflow created via API',
      nodes: [
        {
          id: 'start',
          type: 'start',
          name: 'Start',
          position: { x: 100, y: 100 },
          parameters: {},
        },
        {
          id: 'webhook',
          type: 'webhook',
          name: 'Webhook Trigger',
          position: { x: 300, y: 100 },
          parameters: {
            path: '/test-webhook',
            method: 'POST',
            responseMode: 'onReceived',
          },
        },
      ],
      connections: [
        {
          source: 'start',
          target: 'webhook',
        },
      ],
      active: false,
    };
    
    const options = {
      ...parseUrl(`${API_BASE}/api/workflows`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options, workflowData);
    
    if (response.statusCode === 201) {
      console.log('✅ Workflow created successfully');
      console.log('🆔 Workflow ID:', response.body.id);
      console.log('📛 Workflow name:', response.body.name);
      return response.body.id;
    } else {
      console.log('❌ Workflow creation failed:', response.statusCode);
      console.log('Error:', response.body);
      return null;
    }
  } catch (error) {
    console.log('❌ Workflow creation error:', error.message);
    return null;
  }
}

async function testWebhook(workflowId) {
  if (!workflowId) return;
  
  console.log('\n🪝 Testing webhook...');
  
  try {
    const options = {
      ...parseUrl(`${API_BASE}/webhook/test-webhook`),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-key',
      },
    };
    
    const testData = {
      message: 'Hello from API test!',
      timestamp: new Date().toISOString(),
      data: { test: true },
    };
    
    const response = await makeRequest(options, testData);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Webhook triggered successfully');
      console.log('📨 Response:', response.body.message || 'OK');
    } else {
      console.log('❌ Webhook failed:', response.statusCode);
      console.log('Response:', response.body);
    }
  } catch (error) {
    console.log('❌ Webhook error:', error.message);
  }
}

async function testCredentialTypes() {
  console.log('\n🔐 Testing credential types...');
  
  try {
    const options = {
      ...parseUrl(`${API_BASE}/api/credential-types`),
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      const credentialTypes = Array.isArray(response.body) ? response.body : [];
      console.log('✅ Credential types retrieved');
      console.log('🔐 Total types:', credentialTypes.length);
      
      if (credentialTypes.length > 0) {
        console.log('🏷️ Available types:', credentialTypes.slice(0, 3).map(c => c.type || c.name).join(', '));
      }
    } else {
      console.log('❌ Credential types failed:', response.statusCode);
    }
  } catch (error) {
    console.log('❌ Credential types error:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Workflow Automation Platform API Tests');
  console.log('🌐 Testing against:', API_BASE);
  console.log('═'.repeat(60));
  
  await testHealthCheck();
  await testApiInfo();
  await testNodeTypes();
  await testCredentialTypes();
  await testWorkflows();
  
  const workflowId = await testCreateWorkflow();
  await testWebhook(workflowId);
  
  console.log('\n' + '═'.repeat(60));
  console.log('🏁 API tests completed!');
  console.log('\n💡 Next steps:');
  console.log('   - Start the server: npm start');
  console.log('   - Test more endpoints using curl or Postman');
  console.log('   - Check the logs for detailed information');
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testHealthCheck,
  testApiInfo,
  testNodeTypes,
  testWorkflows,
  testCreateWorkflow,
  testWebhook,
  testCredentialTypes,
};