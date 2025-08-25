# Dashboard Analytics API Documentation

## Overview
The Dashboard Analytics API provides comprehensive metrics, statistics, and reporting capabilities for the workflow automation platform. All endpoints require authentication.

## Base URL
```
/api/dashboard
```

## Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. System Metrics
Get overall system metrics and statistics.

**Endpoint:** `GET /api/dashboard/metrics/system`

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalWorkflows": 150,
    "activeWorkflows": 42,
    "totalExecutions": 5230,
    "totalUsers": 25,
    "executionsToday": 87,
    "executionsThisWeek": 423,
    "executionsThisMonth": 1450,
    "topWorkflows": [...],
    "executionTrend": [...],
    "nodeUsageStats": [...]
  }
}
```

### 2. Workflow Statistics
Get detailed statistics for a specific workflow.

**Endpoint:** `GET /api/dashboard/metrics/workflow/:workflowId`

**Parameters:**
- `workflowId` (path) - The workflow ID

**Response:**
```json
{
  "status": "success",
  "data": {
    "workflowId": "wf_123",
    "workflowName": "Data Processing Pipeline",
    "executions": {
      "total": 245,
      "succeeded": 230,
      "failed": 15,
      "running": 0,
      "pending": 0,
      "averageDuration": 5420,
      "successRate": 93.88
    },
    "lastExecuted": "2025-08-24T10:30:00Z",
    "createdAt": "2025-07-01T08:00:00Z",
    "averageNodeCount": 8
  }
}
```

### 3. Execution Metrics
Get execution metrics for a date range.

**Endpoint:** `GET /api/dashboard/metrics/executions`

**Query Parameters:**
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 500,
    "succeeded": 450,
    "failed": 50,
    "running": 0,
    "pending": 0,
    "averageDuration": 3200,
    "successRate": 90.0
  }
}
```

### 4. Performance Metrics
Get performance metrics including percentile execution times.

**Endpoint:** `GET /api/dashboard/metrics/performance`

**Query Parameters:**
- `startDate` (optional) - ISO date string
- `endDate` (optional) - ISO date string

**Response:**
```json
{
  "status": "success",
  "data": {
    "avgExecutionTime": 3500,
    "p50ExecutionTime": 2500,
    "p95ExecutionTime": 8000,
    "p99ExecutionTime": 15000,
    "slowestWorkflows": [
      {
        "workflowId": "wf_456",
        "workflowName": "Complex Data Transform",
        "avgDuration": 12000,
        "executionCount": 45
      }
    ]
  }
}
```

### 5. User Activity Metrics
Get activity metrics for the authenticated user.

**Endpoint:** `GET /api/dashboard/metrics/user-activity`

**Query Parameters:**
- `days` (optional, default: 30) - Number of days to look back

**Response:**
```json
{
  "status": "success",
  "data": {
    "totalWorkflows": 12,
    "totalExecutions": 234,
    "successRate": "92.31",
    "averageExecutionsPerDay": "7.80",
    "mostActiveWorkflows": [...],
    "dailyActivity": [
      {
        "date": "2025-08-24",
        "count": 15
      }
    ]
  }
}
```

### 6. Generate Reports
Generate comprehensive reports for different time periods.

**Endpoint:** `GET /api/dashboard/reports/:type`

**Parameters:**
- `type` (path) - Report type: `daily`, `weekly`, or `monthly`

**Response:**
```json
{
  "status": "success",
  "data": {
    "reportType": "monthly",
    "generatedAt": "2025-08-24T12:00:00Z",
    "dateRange": {
      "start": "2025-07-25T00:00:00Z",
      "end": "2025-08-24T23:59:59Z"
    },
    "systemMetrics": {...},
    "executionMetrics": {...},
    "performanceMetrics": {...}
  }
}
```

### 7. Execution Trend Chart Data
Get execution trend data for charts.

**Endpoint:** `GET /api/dashboard/charts/execution-trend`

**Query Parameters:**
- `days` (optional, default: 30) - Number of days

**Response:**
```json
{
  "status": "success",
  "data": {
    "trend": [
      {
        "date": "2025-08-20",
        "count": 45,
        "successCount": 42,
        "failureCount": 3
      }
    ],
    "period": "30 days"
  }
}
```

### 8. Node Usage Statistics
Get statistics on node type usage.

**Endpoint:** `GET /api/dashboard/charts/node-usage`

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "nodeType": "http-request",
      "usageCount": 234,
      "percentage": 25.5
    },
    {
      "nodeType": "transform",
      "usageCount": 189,
      "percentage": 20.6
    }
  ]
}
```

### 9. Workflow Performance Chart
Get top performing workflows.

**Endpoint:** `GET /api/dashboard/charts/workflow-performance`

**Query Parameters:**
- `limit` (optional, default: 10) - Number of workflows to return

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "workflowId": "wf_123",
      "workflowName": "Data Sync",
      "executions": {
        "total": 500,
        "succeeded": 485,
        "failed": 15,
        "successRate": 97.0
      },
      "lastExecuted": "2025-08-24T11:00:00Z"
    }
  ]
}
```

### 10. Dashboard Summary
Get a comprehensive dashboard summary.

**Endpoint:** `GET /api/dashboard/summary`

**Response:**
```json
{
  "status": "success",
  "data": {
    "overview": {
      "totalWorkflows": 150,
      "activeWorkflows": 42,
      "totalExecutions": 5230,
      "totalUsers": 25
    },
    "today": {
      "executions": 87,
      "successRate": 94.25,
      "averageDuration": 3200
    },
    "week": {
      "executions": 423,
      "successRate": 92.43,
      "averageDuration": 3500
    },
    "performance": {
      "avgExecutionTime": 3400,
      "p95ExecutionTime": 8500
    },
    "topWorkflows": [...],
    "recentTrend": [...]
  }
}
```

### 11. Export Analytics Data
Export analytics data in different formats.

**Endpoint:** `POST /api/dashboard/export`

**Request Body:**
```json
{
  "format": "csv",  // or "json"
  "reportType": "monthly"  // "daily", "weekly", or "monthly"
}
```

**Response:**
- For JSON format: Returns JSON data with appropriate headers
- For CSV format: Returns CSV file with appropriate headers

**Headers:**
```
Content-Type: text/csv (or application/json)
Content-Disposition: attachment; filename=analytics-report-2025-08-24.csv
```

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Failed to retrieve data"
}
```

## Rate Limiting
- API rate limit: 100 requests per minute per user
- Export endpoints: 10 requests per hour per user

## Permissions
- Regular users can only view their own workflow analytics
- Admin users can view system-wide analytics
- The `role` field in the JWT token determines access level

## Best Practices

1. **Date Ranges**: When querying with date ranges, keep ranges reasonable (< 90 days) for optimal performance.

2. **Caching**: Dashboard data is cached for 5 minutes. For real-time data, use the specific metric endpoints.

3. **Pagination**: For endpoints returning large datasets, use pagination parameters when available.

4. **Export Formats**: 
   - Use JSON for programmatic access
   - Use CSV for spreadsheet analysis

5. **Polling**: For real-time dashboards, poll summary endpoint every 30 seconds maximum.

## Examples

### Get last 7 days of execution metrics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.example.com/api/dashboard/metrics/executions?startDate=2025-08-17&endDate=2025-08-24"
```

### Export monthly report as CSV
```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","reportType":"monthly"}' \
  "https://api.example.com/api/dashboard/export" \
  -o monthly-report.csv
```

### Get workflow-specific statistics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.example.com/api/dashboard/metrics/workflow/wf_123"
```

## Dashboard UI Integration

The analytics data can be visualized using various charting libraries:

1. **Time Series Charts**: Use execution trend data for line charts
2. **Pie Charts**: Use node usage statistics for distribution visualization
3. **Bar Charts**: Use workflow performance data for comparison
4. **KPI Cards**: Use summary data for key metrics display
5. **Heat Maps**: Use daily activity data for calendar visualization

## Performance Considerations

1. **Data Aggregation**: Metrics are pre-aggregated hourly for performance
2. **Indexing**: Database indexes on createdAt, workflowId, and status fields
3. **Caching**: Redis caching for frequently accessed metrics
4. **Query Optimization**: Complex queries use database views for efficiency

## Future Enhancements

- Real-time WebSocket updates for live dashboards
- Custom metric definitions
- Alerting based on metric thresholds
- Machine learning-based anomaly detection
- Predictive analytics for workflow performance
- Custom dashboard layouts and widgets