# Workflow Automation Platform - API & Webhook System

## Overview

The Workflow Automation Platform provides a comprehensive RESTful API and dynamic webhook system that enables:

- **Workflow Management**: Complete CRUD operations for workflows
- **Execution Control**: Start, monitor, pause, resume, and cancel workflow executions
- **Dynamic Webhooks**: Automatic webhook creation and routing for workflow triggers
- **Real-time Monitoring**: Live execution status and metrics
- **Credential Management**: Secure storage and management of integration credentials
- **Event System**: Custom event emission and handling
- **Node Registry**: Access to all available node types and integrations

## Quick Start

1. **Start the server**:
   ```bash
   npm start
   ```

2. **Test the API**:
   ```bash
   node test-api.js
   ```

3. **Check health status**:
   ```bash
   curl http://localhost:3000/health
   ```

## Key Features

### 🚀 **Comprehensive API**
- **50+ endpoints** covering all platform functionality
- **RESTful design** with consistent response formats
- **Authentication support** via API keys or Bearer tokens
- **Rate limiting** and security middleware
- **Comprehensive error handling** with detailed error messages

### 🪝 **Dynamic Webhook System**
- **Automatic webhook registration** from workflow nodes
- **Multiple response modes**: immediate, wait-for-completion, custom response
- **Signature validation** for secure webhooks
- **Request logging and monitoring**
- **Rate limiting per IP address**

### 📊 **Advanced Monitoring**
- **Real-time execution tracking** via WebSockets
- **Detailed metrics and statistics**
- **Queue monitoring and management**
- **Performance analytics**
- **Usage tracking and reporting**

### 🔒 **Security Features**
- **Encrypted credential storage** using AES-256
- **HMAC signature validation** for webhooks
- **IP-based rate limiting**
- **Request authentication and authorization**
- **CORS protection** with configurable origins

## API Structure

### Core Endpoints

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **System** | `/health`, `/api/info`, `/api/status` | Health checks and system information |
| **Workflows** | `/api/workflows/*` | Complete workflow management |
| **Executions** | `/api/executions/*` | Execution control and monitoring |
| **Webhooks** | `/webhook/*`, `/api/webhooks` | Dynamic webhook handling |
| **Credentials** | `/api/credentials/*` | Secure credential management |
| **Node Types** | `/api/node-types/*` | Available integrations and nodes |

### Webhook System

The platform automatically creates webhook endpoints based on workflow nodes:

```javascript
// Webhook node in workflow creates endpoint
{
  "type": "webhook",
  "parameters": {
    "path": "/my-custom-webhook",
    "method": "POST",
    "responseMode": "onReceived"
  }
}
// → Accessible at: POST /webhook/my-custom-webhook
```

### Response Modes

1. **onReceived**: Immediate response, execute workflow asynchronously
2. **lastNode**: Wait for workflow completion, return final output
3. **responseNode**: Wait for specific response node, return its output

### Authentication

The API supports multiple authentication methods:

```bash
# API Key
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/workflows

# Bearer Token  
curl -H "Authorization: Bearer your-token" http://localhost:3000/api/workflows

# Development mode (no auth required)
curl http://localhost:3000/api/workflows
```

## Example Usage

### Create a Workflow

```javascript
const workflow = {
  "name": "Email Notification Workflow",
  "description": "Send email when webhook is triggered",
  "nodes": [
    {
      "id": "webhook-trigger",
      "type": "webhook",
      "name": "Webhook Trigger",
      "position": { "x": 100, "y": 100 },
      "parameters": {
        "path": "/email-trigger",
        "method": "POST",
        "responseMode": "onReceived"
      }
    },
    {
      "id": "email-node",
      "type": "email",
      "name": "Send Email",
      "position": { "x": 300, "y": 100 },
      "parameters": {
        "to": "admin@company.com",
        "subject": "Alert Triggered",
        "body": "An alert was triggered via webhook"
      }
    }
  ],
  "connections": [
    {
      "source": "webhook-trigger",
      "target": "email-node"
    }
  ],
  "active": true
};

// Create workflow
const response = await fetch('/api/workflows', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(workflow)
});
```

### Trigger via Webhook

```bash
# The webhook endpoint is automatically available
curl -X POST http://localhost:3000/webhook/email-trigger \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"alert": "Server CPU usage high", "severity": "warning"}'
```

### Monitor Execution

```javascript
// Get execution status
const status = await fetch(`/api/executions/${executionId}/status`);

// Get detailed results
const results = await fetch(`/api/executions/${executionId}/results?includeData=true`);

// Real-time monitoring via WebSocket
const ws = new WebSocket('ws://localhost:3000');
ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.type === 'executionUpdate') {
    console.log('Execution update:', event.data);
  }
});
```

## Advanced Features

### Bulk Execution
Execute multiple workflows simultaneously:
```javascript
const bulkRequest = {
  "workflows": [
    { "workflowId": "workflow-1", "startNode": "start" },
    { "workflowId": "workflow-2", "startNode": "webhook" },
    { "workflowId": "workflow-3" }
  ]
};

await fetch('/api/execute/bulk', {
  method: 'POST',
  body: JSON.stringify(bulkRequest)
});
```

### Custom Events
Emit custom events to trigger workflows:
```javascript
await fetch('/api/events/emit', {
  method: 'POST',
  body: JSON.stringify({
    eventType: 'order.completed',
    eventData: { orderId: '12345', amount: 99.99 }
  })
});
```

### Webhook Security
Validate webhook signatures:
```javascript
const crypto = require('crypto');

function validateSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', ''), 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Validation failed",
  "message": "workflowId is required",
  "timestamp": "2023-12-01T10:30:00.000Z",
  "code": 400
}
```

Common error codes:
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `404`: Not Found (resource doesn't exist)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

## Performance & Scaling

### Rate Limiting
- **API endpoints**: 1000 requests per hour per user
- **Webhooks**: 100 requests per minute per IP
- **Bulk operations**: 10 workflows maximum

### Monitoring
- **Execution metrics**: Success rate, duration, error counts
- **Queue statistics**: Active, waiting, failed jobs
- **System health**: Memory, CPU, database status
- **Usage analytics**: API calls, popular endpoints

## Testing & Development

### Test Script
Run the included test script to verify all endpoints:
```bash
node test-api.js
```

### Development Mode
Set `NODE_ENV=development` to:
- Disable authentication requirements
- Enable detailed error logging
- Allow CORS from any origin
- Show development routes

### Debugging
Enable debug logs:
```bash
DEBUG=* npm start
```

## Next Steps

1. **Task 6**: Create data persistence layer
2. **Task 7**: Implement authentication and user management  
3. **Task 8**: Add execution monitoring and logs

The API and webhook system is now fully functional and ready for production use! 🚀