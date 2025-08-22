# Execution Monitoring & Logging System

## Overview

The Workflow Automation Platform includes comprehensive execution monitoring and logging capabilities that provide real-time insights into workflow performance, detailed execution logs, system metrics, and proactive alerting. This system is designed for production-grade monitoring and debugging.

## Architecture

```
Monitoring System
├── Execution Monitoring Service  - Real-time execution tracking and metrics
├── Execution Logging Service     - Detailed logging with buffering and search
├── Execution Log Model          - Database storage for logs and metrics
├── Monitoring Controller        - REST API for monitoring data
└── WebSocket Integration        - Real-time updates to connected clients
```

## Key Features

### 🔍 Real-time Execution Monitoring
- **Live execution tracking** with performance metrics
- **Node-level monitoring** with execution progress
- **Performance analytics** (throughput, duration, resource usage)
- **Active execution dashboard** with real-time updates

### 📊 System Metrics & Analytics
- **System health monitoring** with CPU, memory, and disk usage
- **Workflow health analysis** with success rates and performance ratings
- **Performance trends** over time with historical data
- **Queue statistics** and execution statistics

### 📝 Comprehensive Logging
- **Multi-level logging** (debug, info, warn, error)
- **Structured log entries** with metadata and context
- **Real-time log streaming** via WebSocket
- **Performance tracking** with automatic timing and resource monitoring

### 🚨 Intelligent Alerting
- **Configurable alert rules** for various conditions
- **Multiple notification channels** (email, webhook, Slack)
- **Performance degradation detection**
- **Execution timeout monitoring**

### 🔎 Advanced Search & Analytics
- **Full-text log search** with filtering capabilities
- **Log statistics and aggregations**
- **Node performance analysis**
- **Error trend analysis**

## API Endpoints

### Dashboard & System Metrics

#### Get Dashboard Metrics
```bash
GET /api/monitoring/dashboard
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "system": {
      "activeExecutions": 5,
      "queuedExecutions": 12,
      "totalExecutionsToday": 150,
      "successRateToday": 94.2,
      "avgExecutionTime": 3500,
      "systemLoad": {
        "cpu": 45.6,
        "memory": 67.8,
        "disk": 23.1
      },
      "topWorkflows": [
        {
          "workflowId": "uuid",
          "name": "Data Processing Pipeline",
          "executions": 45,
          "successRate": 96.7
        }
      ],
      "recentErrors": [
        {
          "executionId": "uuid",
          "workflowName": "Email Campaign",
          "error": "SMTP connection timeout",
          "timestamp": "2023-12-01T15:30:00Z"
        }
      ]
    },
    "trends": {
      "executionTrends": [
        {
          "date": "2023-12-01",
          "executions": 150,
          "success": 141,
          "errors": 9,
          "avgDuration": 3200
        }
      ],
      "throughputTrends": [
        {
          "date": "2023-12-01",
          "avgThroughput": 2.3,
          "peakThroughput": 5.7
        }
      ]
    },
    "active": {
      "executions": [
        {
          "executionId": "uuid",
          "workflowId": "uuid",
          "status": "running",
          "startTime": "2023-12-01T15:00:00Z",
          "nodesExecuted": 3,
          "nodesTotal": 8,
          "throughput": 1.2
        }
      ],
      "count": 5
    },
    "summary": {
      "totalActiveExecutions": 5,
      "runningExecutions": 3,
      "completedToday": 150,
      "successRateToday": 94.2,
      "avgExecutionTime": 3500
    }
  }
}
```

#### Get System Metrics
```bash
GET /api/monitoring/system
Authorization: Bearer <access-token>
```

#### Get Performance Trends
```bash
GET /api/monitoring/trends?days=30
Authorization: Bearer <access-token>
```

### Execution Monitoring

#### Get Active Executions
```bash
GET /api/monitoring/executions/active
Authorization: Bearer <access-token>
```

#### Get Execution Metrics
```bash
GET /api/monitoring/executions/{executionId}/metrics
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "metrics": {
    "executionId": "uuid",
    "workflowId": "uuid",
    "userId": "uuid",
    "status": "running",
    "startTime": "2023-12-01T15:00:00Z",
    "duration": 45000,
    "nodesExecuted": 5,
    "nodesTotal": 10,
    "errorCount": 0,
    "warningCount": 1,
    "memoryUsage": 25698304,
    "cpuUsage": 12.5,
    "throughput": 2.1,
    "dataProcessed": 1048576,
    "currentNode": {
      "id": "node-5",
      "name": "Send Email",
      "type": "email",
      "startTime": "2023-12-01T15:00:40Z"
    }
  }
}
```

#### Get Workflow Health
```bash
GET /api/monitoring/workflows/{workflowId}/health?days=7
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "health": {
    "workflowId": "uuid",
    "workflowName": "Data Processing Pipeline",
    "totalExecutions": 50,
    "successRate": 96.0,
    "avgDuration": 3200,
    "avgThroughput": 2.8,
    "lastExecution": "2023-12-01T14:30:00Z",
    "errorRate": 4.0,
    "performance": "excellent",
    "issues": [],
    "recommendations": [
      "Consider adding retry logic for external API calls"
    ]
  }
}
```

### Execution Logs

#### Get Execution Logs
```bash
GET /api/monitoring/executions/{executionId}/logs?level=error&nodeId=node-5&limit=100&offset=0
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": "uuid",
      "level": "info",
      "message": "Starting node execution: HTTP Request",
      "details": {
        "nodeType": "http",
        "stepIndex": 3,
        "url": "https://api.example.com/data",
        "method": "GET"
      },
      "nodeId": "node-3",
      "nodeName": "HTTP Request",
      "nodeType": "http",
      "stepIndex": 3,
      "timestamp": "2023-12-01T15:00:30Z",
      "duration": 1200,
      "memoryUsage": 1048576,
      "cpuUsage": 5.2,
      "metadata": {
        "requestId": "req-123",
        "traceId": "trace-456"
      }
    }
  ],
  "total": 45
}
```

#### Get Workflow Logs
```bash
GET /api/monitoring/workflows/{workflowId}/logs?startDate=2023-12-01&endDate=2023-12-02&limit=100
Authorization: Bearer <access-token>
```

#### Get Execution Summary
```bash
GET /api/monitoring/executions/{executionId}/summary
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "totalLogs": 156,
    "logLevels": [
      { "level": "info", "count": 120 },
      { "level": "warn", "count": 25 },
      { "level": "error", "count": 8 },
      { "level": "debug", "count": 3 }
    ],
    "errorCount": 8,
    "warningCount": 25,
    "duration": 45000,
    "nodeStats": [
      {
        "nodeId": "node-1",
        "nodeName": "Start",
        "logCount": 12,
        "errorCount": 0
      },
      {
        "nodeId": "node-2",
        "nodeName": "HTTP Request",
        "logCount": 45,
        "errorCount": 3
      }
    ]
  }
}
```

### Log Search & Analytics

#### Search Logs
```bash
GET /api/monitoring/logs/search?message=timeout&level=error&startDate=2023-12-01&limit=50&offset=0
Authorization: Bearer <access-token>
```

**Query Parameters:**
- `workflowId` - Filter by workflow
- `executionId` - Filter by execution
- `level` - Filter by log level (debug, info, warn, error)
- `message` - Search in log messages (case-insensitive)
- `nodeId` - Filter by specific node
- `startDate` - Start date for time range
- `endDate` - End date for time range
- `limit` - Number of results to return (default: 100)
- `offset` - Pagination offset (default: 0)

#### Get Log Statistics
```bash
GET /api/monitoring/logs/statistics?workflowId=uuid&startDate=2023-11-01&endDate=2023-12-01
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "success": true,
  "statistics": {
    "totalLogs": 15420,
    "logsByLevel": [
      { "level": "info", "count": 12350 },
      { "level": "warn", "count": 2100 },
      { "level": "error", "count": 870 },
      { "level": "debug", "count": 100 }
    ],
    "logsByHour": [
      { "hour": "2023-12-01T15:00:00Z", "count": 450 },
      { "hour": "2023-12-01T14:00:00Z", "count": 320 }
    ],
    "topErrorMessages": [
      { "message": "Connection timeout", "count": 45 },
      { "message": "Rate limit exceeded", "count": 23 }
    ],
    "nodePerformance": [
      {
        "nodeId": "node-http-1",
        "nodeName": "API Request",
        "avgDuration": 1250.5,
        "errorRate": 3.2
      }
    ],
    "executionTrends": [
      {
        "date": "2023-12-01",
        "executions": 150,
        "errors": 8,
        "avgDuration": 3200
      }
    ]
  }
}
```

### Administrative Operations

#### Cleanup Old Logs
```bash
POST /api/monitoring/logs/cleanup
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "retentionDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleaned up 5423 old log entries",
  "deletedCount": 5423,
  "retentionDays": 30
}
```

## Real-time Updates

### WebSocket Integration

The monitoring system provides real-time updates via WebSocket connections:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3000');

// Listen for execution metrics updates
ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'execution_metrics':
      updateExecutionDashboard(message.data);
      break;
      
    case 'execution_log':
      appendLogEntry(message.data.log);
      break;
      
    case 'system_metrics':
      updateSystemDashboard(message.data);
      break;
      
    case 'alert_triggered':
      showAlert(message.data.rule);
      break;
  }
});
```

### Real-time Log Streaming

```javascript
// Subscribe to execution logs
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: `execution:${executionId}:logs`
}));

// Receive real-time log entries
ws.on('message', (data) => {
  const message = JSON.parse(data);
  if (message.type === 'execution_log') {
    console.log('New log entry:', message.data.log);
  }
});
```

## Alert System

### Default Alert Rules

The system comes with pre-configured alert rules:

1. **High Error Rate**: Triggers when error rate exceeds 20% within 1 hour
2. **Execution Timeout**: Triggers when executions run longer than 10 minutes
3. **Performance Degradation**: Triggers when average execution time increases by 50% over 2 hours

### Custom Alert Configuration

```typescript
const alertRule = {
  id: 'custom-memory-alert',
  name: 'High Memory Usage',
  type: 'performance_degradation',
  condition: {
    threshold: 80, // 80% memory usage
    timeWindow: 30, // 30 minutes
    metric: 'memory_usage'
  },
  actions: [
    { type: 'email', target: 'admin@example.com' },
    { type: 'webhook', target: 'https://hooks.slack.com/...' }
  ],
  enabled: true
};
```

## Performance Features

### Log Buffering
- **Batch processing** of log entries for optimal database performance
- **Configurable buffer size** (default: 100 entries)
- **Automatic flushing** every 5 seconds or when buffer is full
- **Immediate flushing** for error-level logs

### Database Optimization
- **Comprehensive indexes** for fast query performance
- **Partitioned tables** for large-scale log storage
- **Automatic cleanup** of old logs with configurable retention
- **Efficient aggregation queries** for statistics

### Memory Management
- **Streaming results** for large result sets
- **Pagination support** for all list endpoints
- **Memory-efficient data structures**
- **Garbage collection optimization**

## Integration with Workflow Engine

### Automatic Integration

The monitoring system automatically integrates with the workflow execution engine:

```typescript
// In WorkflowEngine.ts
import { executionMonitoringService } from './services/ExecutionMonitoringService';
import { executionLoggingService } from './services/ExecutionLoggingService';

class WorkflowEngine {
  async executeWorkflow(workflowId: string, userId?: string) {
    const executionId = uuid.v4();
    
    // Start monitoring
    executionMonitoringService.startExecutionMonitoring(
      executionId, 
      workflowId, 
      userId, 
      workflow.nodes.length
    );
    
    // Log execution start
    await executionLoggingService.logExecutionStart({
      executionId,
      workflowId,
      userId
    }, {
      mode: 'manual',
      trigger: 'user',
      inputData: 'present'
    });
    
    // Execute nodes with logging
    for (const node of workflow.nodes) {
      await executionLoggingService.logNodeExecution(
        { executionId, workflowId, userId, nodeId: node.id, nodeName: node.name },
        'start'
      );
      
      try {
        const result = await this.executeNode(node);
        
        await executionLoggingService.logNodeExecution(
          { executionId, workflowId, userId, nodeId: node.id, nodeName: node.name },
          'complete',
          { outputSize: JSON.stringify(result).length }
        );
        
        // Update monitoring progress
        executionMonitoringService.updateExecutionProgress(executionId, {
          nodeId: node.id,
          nodeName: node.name,
          nodesExecuted: completedNodes++
        });
        
      } catch (error) {
        await executionLoggingService.logNodeExecution(
          { executionId, workflowId, userId, nodeId: node.id, nodeName: node.name },
          'error',
          { error: error.message, stack: error.stack }
        );
        
        executionMonitoringService.updateExecutionProgress(executionId, {
          errorCount: ++errorCount
        });
      }
    }
    
    // Complete monitoring
    executionMonitoringService.completeExecutionMonitoring(
      executionId,
      'completed',
      { finalOutputSize: 1024 }
    );
  }
}
```

## Usage Examples

### Frontend Dashboard Integration

```javascript
// React component for real-time dashboard
function MonitoringDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [ws, setWs] = useState(null);
  
  useEffect(() => {
    // Fetch initial dashboard data
    fetch('/api/monitoring/dashboard', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    .then(res => res.json())
    .then(data => setDashboardData(data.dashboard));
    
    // Connect to WebSocket for real-time updates
    const websocket = new WebSocket('ws://localhost:3000');
    websocket.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'system_metrics') {
        setDashboardData(prev => ({
          ...prev,
          system: message.data
        }));
      }
    });
    
    setWs(websocket);
    
    return () => websocket.close();
  }, []);
  
  return (
    <div className="monitoring-dashboard">
      <SystemMetrics data={dashboardData?.system} />
      <ActiveExecutions executions={dashboardData?.active?.executions} />
      <PerformanceTrends trends={dashboardData?.trends} />
      <AlertsPanel />
    </div>
  );
}
```

### Log Viewer Component

```javascript
function ExecutionLogViewer({ executionId }) {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ level: 'all', nodeId: 'all' });
  const [loading, setLoading] = useState(false);
  
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
        ...(filters.level !== 'all' && { level: filters.level }),
        ...(filters.nodeId !== 'all' && { nodeId: filters.nodeId })
      });
      
      const response = await fetch(
        `/api/monitoring/executions/${executionId}/logs?${params}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [executionId, filters]);
  
  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);
  
  // Real-time log updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000');
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: `execution:${executionId}:logs`
    }));
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.type === 'execution_log') {
        setLogs(prev => [...prev, message.data.log]);
      }
    });
    
    return () => ws.close();
  }, [executionId]);
  
  return (
    <div className="log-viewer">
      <LogFilters filters={filters} onFiltersChange={setFilters} />
      <div className="log-entries">
        {logs.map(log => (
          <LogEntry key={log.id} log={log} />
        ))}
      </div>
      {loading && <LoadingSpinner />}
    </div>
  );
}
```

## Configuration

### Environment Variables

```env
# Monitoring Configuration
MONITORING_ENABLED=true
MONITORING_RETENTION_DAYS=30
MONITORING_BUFFER_SIZE=100
MONITORING_FLUSH_INTERVAL=5000

# Alerting Configuration
ALERTS_ENABLED=true
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_FROM=alerts@yourcompany.com
ALERT_WEBHOOK_TIMEOUT=5000

# Performance Configuration
MONITORING_MAX_MEMORY_MB=500
MONITORING_MAX_LOG_SIZE_MB=100
```

### Database Configuration

The monitoring system requires the following database tables, which are automatically created:

- `execution_logs` - Stores detailed execution logs
- `execution_metrics` - Stores aggregated execution metrics (optional)
- `alert_rules` - Stores custom alert configurations (optional)

## Best Practices

### 1. Log Level Usage
- **Debug**: Detailed information for troubleshooting
- **Info**: General information about execution flow
- **Warn**: Warning conditions that should be monitored
- **Error**: Error conditions that require attention

### 2. Performance Optimization
- Use pagination for large result sets
- Filter logs by time range to reduce query load
- Clean up old logs regularly using the cleanup endpoint
- Monitor system resource usage

### 3. Alert Configuration
- Set appropriate thresholds based on your system's normal behavior
- Use multiple notification channels for critical alerts
- Include cooldown periods to avoid alert spam
- Test alert rules regularly

### 4. Real-time Monitoring
- Subscribe only to necessary WebSocket channels
- Implement proper error handling for WebSocket connections
- Use connection pooling for multiple dashboard clients
- Implement automatic reconnection logic

---

**Task 8: Add execution monitoring and logs** is now complete! 

The system provides enterprise-grade monitoring with real-time execution tracking, comprehensive logging, advanced analytics, intelligent alerting, and seamless integration with the workflow execution engine. 📊✨