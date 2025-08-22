# Workflow Automation Platform API Endpoints

## Health & System
- `GET /health` - System health check
- `GET /api/info` - API information and documentation
- `GET /api/status` - Detailed system status and statistics

## Node Types
- `GET /api/node-types` - Get all available node types
- `GET /api/node-types/categories` - Get all node categories
- `GET /api/node-types/category/:category` - Get nodes by category

## Workflows
- `GET /api/workflows` - Get all workflows
- `GET /api/workflows/stats` - Get workflow statistics
- `GET /api/workflows/:workflowId` - Get workflow by ID
- `POST /api/workflows` - Create new workflow
- `PUT /api/workflows/:workflowId` - Update workflow
- `DELETE /api/workflows/:workflowId` - Delete workflow
- `POST /api/workflows/:workflowId/activate` - Activate workflow
- `POST /api/workflows/:workflowId/deactivate` - Deactivate workflow
- `POST /api/workflows/:workflowId/test` - Test workflow execution
- `POST /api/workflows/:workflowId/duplicate` - Duplicate workflow
- `GET /api/workflows/:workflowId/webhooks` - Get workflow webhooks

## Executions
- `POST /api/executions` - Start workflow execution
- `GET /api/executions` - Get execution history
- `GET /api/executions/:executionId/status` - Get execution status
- `POST /api/executions/:executionId/pause` - Pause execution
- `POST /api/executions/:executionId/resume` - Resume execution
- `POST /api/executions/:executionId/cancel` - Cancel execution
- `POST /api/executions/:executionId/retry` - Retry execution
- `GET /api/executions/metrics` - Get execution metrics
- `GET /api/executions/:executionId/results` - Get execution results

## API Executions (Advanced)
- `POST /api/execute` - Execute workflow via API
- `POST /api/workflows/:workflowId/trigger` - Trigger workflow with data
- `POST /api/execute/bulk` - Bulk execute workflows

## Webhooks
- `POST /api/webhooks` - Create webhook programmatically
- `/webhook/*` - Dynamic webhook endpoints (all HTTP methods)

## Events
- `POST /api/events` - Emit custom event
- `POST /api/events/emit` - Emit event via API

## Triggers
- `GET /api/triggers` - Get active triggers
- `GET /api/triggers/stats` - Get trigger statistics
- `POST /api/triggers/:triggerId/activate` - Activate trigger
- `POST /api/triggers/:triggerId/deactivate` - Deactivate trigger

## Queue Management
- `GET /api/queues/stats` - Get queue statistics

## Credentials
- `GET /api/credential-types` - Get all credential types
- `GET /api/credential-types/:type` - Get specific credential type
- `GET /api/credentials` - Get user credentials
- `POST /api/credentials` - Create credential
- `PUT /api/credentials/:credentialId` - Update credential
- `DELETE /api/credentials/:credentialId` - Delete credential
- `POST /api/credentials/test` - Test credential
- `POST /api/credentials/:credentialId/test` - Test existing credential

## Usage & Analytics
- `GET /api/usage` - Get API usage statistics

## Authentication
Most endpoints support authentication via:
- `X-API-Key` header
- `Authorization: Bearer <token>` header
- Development mode allows unauthenticated requests

## Response Formats
All endpoints return JSON responses with consistent error handling:
```json
{
  "error": "Error message",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## Webhook Signatures
Secured webhooks use HMAC SHA256 signatures in the `X-Webhook-Signature` header.

## Rate Limiting
- Webhook endpoints: 100 requests per minute per IP
- API endpoints: Standard rate limiting applied