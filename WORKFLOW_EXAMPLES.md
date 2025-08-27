# 🚀 Workflow Automation Platform - Usage Examples

This document contains comprehensive examples of all available node combinations and real-world workflow scenarios.

## 📋 Available Nodes

### **Trigger Nodes**
- **Schedule Node** - Cron-based scheduling (`*/5 * * * *` = every 5 minutes)
- **Webhook Node** - HTTP webhook endpoints
- **Manual Trigger** - Manual workflow execution

### **Data Nodes**
- **HTTP Request Node** - API calls (GET, POST, PUT, DELETE)
- **Database Node** - SQL query execution
- **PostgreSQL Node** - PostgreSQL-specific operations
- **MongoDB Node** - MongoDB document operations
- **Redis Node** - Redis cache and key-value operations
- **Email Node** - Send emails with attachments
- **File Upload Node** - Upload files from URL/path/data
- **File Download Node** - Download files to various formats

### **Processing Nodes**
- **Transform Node** - Data manipulation and filtering
- **Condition Node** - If/else logic branching
- **Export Node** - Export to Excel/CSV/JSON
- **PDF Generator Node** - Create PDF documents from data

---

## 🎯 Real-World Workflow Examples

### **1. Data Collection & Export**

#### **Basic API → Export**
```
Schedule (every hour)
  ↓
HTTP Request (GET https://api.example.com/products)
  ↓
Export (Excel with custom headers)
```

**Use Case**: Hourly product inventory reports
**Output**: `products_2025-08-23_16-30.xlsx`

---

#### **Advanced API → Transform → Export**
```
Schedule (daily at 9 AM)
  ↓
HTTP Request (GET https://api.salesforce.com/leads)
  ↓
Transform (filter: status="new", map: name, email, phone)
  ↓
Export (CSV with headers: "Name,Email,Phone")
```

**Use Case**: Daily new leads report for sales team
**JSONPath**: `$.data.leads[?(@.status=="new")]`

---

### **2. File Processing Workflows**

#### **URL → Download → Upload → Export**
```
Manual Trigger
  ↓
HTTP Request (GET https://api.reports.com/monthly-report)
  ↓
File Download (from response URL, save to storage)
  ↓
File Upload (process downloaded file)
  ↓
Export (file metadata and processing status)
```

**Use Case**: Download monthly reports, store locally, track processing

---

#### **Batch File Processing**
```
Schedule (weekly)
  ↓
File Download (from storage: "invoices/*.pdf")
  ↓
Transform (extract file metadata)
  ↓
Export (file inventory report)
```

**Use Case**: Weekly file audit and inventory

---

### **3. Email Automation**

#### **Data → Email with Export**
```
Schedule (daily at 8 AM)
  ↓
HTTP Request (GET https://api.crm.com/daily-metrics)
  ↓
Transform (calculate totals, format data)
  ↓
Export (daily metrics Excel report)
  ↓
Email (send report as attachment to managers)
```

**Use Case**: Daily business metrics email to management

---

#### **Alert System**
```
Schedule (every 15 minutes)
  ↓
Database Query (SELECT * FROM system_alerts WHERE status='critical')
  ↓
Condition (if count > 0)
  ↓ (TRUE)
Email (send alert notification)
  ↓ (FALSE)
[End workflow]
```

**Use Case**: Critical system alert monitoring

---

### **4. Database Operations**

#### **PostgreSQL Data Processing**
```
Schedule (daily at midnight)
  ↓
PostgreSQL Node (SELECT * FROM users WHERE created_date >= CURRENT_DATE - INTERVAL '1 day')
  ↓
Transform (format user data)
  ↓
Export (new users report)
```

**Use Case**: Daily new user registrations report

---

#### **MongoDB Document Processing**
```
Webhook (POST /webhook/analytics-event)
  ↓
Transform (extract event data)
  ↓
MongoDB Node (insertOne into events collection)
  ↓
Redis Node (increment user session counter)
  ↓
Export (event processing log)
```

**Use Case**: Real-time analytics event tracking

---

#### **Redis Cache Management**
```
Schedule (every 5 minutes)
  ↓
PostgreSQL Node (SELECT id, data FROM products WHERE updated > NOW() - INTERVAL '5 minutes')
  ↓
Transform (format for cache)
  ↓
Redis Node (set cache keys with TTL)
  ↓
Export (cache update log)
```

**Use Case**: Automated product cache refresh

---

#### **Multi-Database Sync**
```
Schedule (hourly)
  ↓
MongoDB Node (find recent orders)
  ↓
Transform (convert to SQL format)
  ↓
PostgreSQL Node (upsert into orders table)
  ↓
Redis Node (update order counters)
  ↓
Export (sync status report)
```

**Use Case**: Synchronize data across different database systems

---

#### **API → Database → Export**
```
Webhook (POST /webhook/customer-data)
  ↓
Transform (validate and format customer data)
  ↓
Database Query (INSERT INTO customers ...)
  ↓
HTTP Request (POST to CRM API with customer ID)
  ↓
Export (processing log)
```

**Use Case**: Customer onboarding pipeline

---

#### **Database Sync**
```
Schedule (every 30 minutes)
  ↓
Database Query (SELECT * FROM orders WHERE synced=0)
  ↓
HTTP Request (POST to external system)
  ↓
Database Query (UPDATE orders SET synced=1 WHERE id IN (...))
  ↓
Export (sync status report)
```

**Use Case**: Synchronize orders with external fulfillment system

---

### **5. PDF Report Generation**

#### **API Data → PDF Invoice**
```
Schedule (monthly)
  ↓
HTTP Request (GET billing API)
  ↓
Transform (format invoice data)
  ↓
PDF Generator (invoice template)
  ↓
Email (send PDF invoice to client)
```

**Use Case**: Automated monthly billing with PDF invoices
**Template**: Invoice with company details, line items, totals

---

#### **Database → PDF Report**
```
Schedule (weekly)
  ↓
Database Query (SELECT sales_data FROM reports WHERE week=...)
  ↓
Transform (calculate metrics and format)
  ↓
PDF Generator (report template with charts and tables)
  ↓
File Upload (save to reports folder)
  ↓
Email (send to management team)
```

**Use Case**: Weekly sales performance reports
**Template**: Business report with metrics and data tables

---

#### **Multi-Format Document Generation**
```
HTTP Request (get customer data)
  ↓
Transform (format data)
  ↓
[Branch 1] Export (Excel spreadsheet)
[Branch 2] PDF Generator (customer report)
[Branch 3] Email (plain text summary)
  ↓
File Upload (save all formats)
```

**Use Case**: Generate customer reports in multiple formats

---

### **6. Complex Multi-Branch Workflows**

#### **Conditional Data Processing**
```
Schedule (hourly)
  ↓
HTTP Request (GET https://api.weather.com/current)
  ↓
Condition (temperature > 30°C)
  ↓ (TRUE - Hot Weather)
    Email (send heat warning to outdoor workers)
    ↓
    Export (heat warning log)
  ↓ (FALSE - Normal Weather)
    Transform (format weather summary)
    ↓
    Export (daily weather log)
```

**Use Case**: Weather-based alert system

---

#### **Multi-Source Data Aggregation**
```
Schedule (daily at midnight)
  ↓
[Branch 1] HTTP Request (GET sales API)
  ↓
  Transform (extract sales data)
  
[Branch 2] HTTP Request (GET inventory API)  
  ↓
  Transform (extract inventory data)
  
[Branch 3] Database Query (SELECT marketing_spend FROM campaigns)
  ↓
  Transform (calculate totals)

[Merge All Branches]
  ↓
Transform (combine all data sources)
  ↓
Export (comprehensive daily report)
  ↓
Email (send to executives)
```

**Use Case**: Executive daily dashboard

---

### **6. File Management & Processing**

#### **Document Processing Pipeline**
```
Webhook (file upload notification)
  ↓
File Download (from uploaded file URL)
  ↓
Transform (extract file metadata: size, type, name)
  ↓
Condition (file type = PDF)
  ↓ (TRUE)
    File Upload (move to PDF processing folder)
    ↓
    HTTP Request (POST to PDF processing service)
  ↓ (FALSE)  
    File Upload (move to general files folder)
  ↓
Export (file processing log)
```

**Use Case**: Automated document sorting and processing

---

#### **Backup & Archive System**
```
Schedule (daily at 2 AM)
  ↓
Database Query (SELECT * FROM files WHERE created_date < DATE_SUB(NOW(), INTERVAL 90 DAY))
  ↓
Transform (create file list)
  ↓
File Download (download old files for archival)
  ↓
File Upload (upload to archive storage)
  ↓
Database Query (UPDATE files SET archived=1 WHERE id IN (...))
  ↓
Export (archival report)
  ↓
Email (send archival summary to IT team)
```

**Use Case**: Automated file archival system

---

## 🔧 Node Parameter Examples

### **HTTP Request Node**
```json
{
  "method": "POST",
  "url": "https://api.example.com/data",
  "headers": {
    "Authorization": "Bearer {{token}}",
    "Content-Type": "application/json"
  },
  "body": {
    "query": "SELECT * FROM products",
    "format": "json"
  }
}
```

### **Transform Node**
```javascript
// JSONPath Examples
"$.products[*].name"           // All product names
"$.data[?(@.price > 100)]"     // Products over $100
"$..email"                     // All email fields recursively
"$.users[0:5]"                 // First 5 users
```

### **Export Node**
```json
{
  "format": "xlsx",
  "fileName": "monthly_report_{{date}}.xlsx",
  "sheetName": "Sales Data",
  "headers": "id,name,price,category,stock",
  "dataPath": "$.products",
  "autoDownload": true
}
```

### **File Upload Node**
```json
{
  "uploadMode": "url",
  "fileUrl": "https://reports.company.com/monthly.pdf",
  "fileName": "monthly_report_{{timestamp}}.pdf",
  "saveToStorage": true
}
```

### **File Download Node**
```json
{
  "downloadMode": "storage",
  "fileName": "report_2025-08-23.pdf",
  "outputFormat": "base64",
  "saveToStorage": false
}
```

### **Email Node**
```json
{
  "to": "manager@company.com",
  "subject": "Daily Report - {{date}}",
  "body": "Please find attached the daily metrics report.",
  "attachments": [
    {
      "filename": "daily_metrics.xlsx",
      "path": "/exports/daily_metrics.xlsx"
    }
  ]
}
```

### **PostgreSQL Node**
```json
{
  "operation": "select",
  "connection": "parameters",
  "host": "localhost",
  "port": 5432,
  "database": "myapp",
  "username": "postgres",
  "password": "password",
  "query": "SELECT id, name, email FROM users WHERE active = true ORDER BY created_at DESC LIMIT 100",
  "ssl": false
}
```

### **MongoDB Node**
```json
{
  "operation": "find",
  "connection": "string",
  "connectionString": "mongodb://user:password@localhost:27017/myapp",
  "collection": "orders",
  "filter": "{\"status\": \"pending\", \"created_at\": {\"$gte\": \"2025-01-01\"}}",
  "projection": "{\"_id\": 1, \"total\": 1, \"customer_id\": 1}",
  "sort": "{\"created_at\": -1}",
  "limit": 50
}
```

### **Redis Node**
```json
{
  "operation": "get",
  "connection": "parameters",
  "host": "localhost",
  "port": 6379,
  "database": 0,
  "password": "redis_password",
  "key": "user:{{userId}}:profile",
  "ttlOnSet": 3600
}
```

### **PDF Generator Node**
```json
{
  "template": "invoice",
  "title": "Monthly Invoice",
  "fileName": "invoice_{{invoiceNumber}}.pdf",
  "format": "A4",
  "orientation": "portrait",
  "dataSource": "full",
  "companyName": "Your Company Inc.",
  "companyAddress": "123 Business St, City, State 12345",
  "includeDate": true,
  "marginSize": 20
}
```

**Available Templates**:
- `invoice` - Professional invoices with line items
- `report` - Business reports with metrics and tables  
- `table` - Simple data tables
- `simple` - Basic documents
- `custom` - Custom HTML templates

### **Database Connection Examples**

#### **PostgreSQL Operations**
```javascript
// Insert operation
{
  "operation": "insert",
  "table": "products",
  "data": "{\"name\": \"New Product\", \"price\": 29.99, \"category\": \"electronics\"}",
  "returnFields": "id, name, created_at"
}

// Update with condition
{
  "operation": "update",
  "table": "users",
  "data": "{\"last_login\": \"2025-08-23T10:30:00Z\"}",
  "whereCondition": "id = $1",
  "parameters": "[123]"
}
```

#### **MongoDB Operations**
```javascript
// Aggregation pipeline
{
  "operation": "aggregate",
  "collection": "sales",
  "pipeline": "[{\"$match\": {\"date\": {\"$gte\": \"2025-08-01\"}}}, {\"$group\": {\"_id\": \"$product_id\", \"total_sales\": {\"$sum\": \"$amount\"}}}]"
}

// Update many documents
{
  "operation": "updateMany",
  "collection": "users",
  "filter": "{\"status\": \"inactive\"}",
  "update": "{\"$set\": {\"archived\": true, \"archived_date\": \"2025-08-23\"}}"
}
```

#### **Redis Operations**
```javascript
// Hash operations
{
  "operation": "hset",
  "hashKey": "user:123",
  "hashField": "email",
  "hashValue": "user@example.com"
}

// List operations
{
  "operation": "lpush",
  "listKey": "notifications:user:123",
  "value": "{\"message\": \"Welcome!\", \"timestamp\": \"2025-08-23T10:30:00Z\"}"
}
```

---

## 📊 Scheduling Examples

### **Cron Expressions**
```bash
"*/5 * * * *"      # Every 5 minutes
"0 9 * * *"        # Daily at 9 AM
"0 9 * * 1-5"      # Weekdays at 9 AM
"0 0 1 * *"        # Monthly on 1st day
"0 9 * * 1"        # Every Monday at 9 AM
"*/15 9-17 * * *"  # Every 15 min during business hours
```

---

## 🔗 Advanced Workflow Patterns

### **1. Error Handling Pattern**
```
HTTP Request (with retry: 3, continue on fail: true)
  ↓ (Success)
    Transform (process data)
    ↓
    Export (success log)
  ↓ (Failure)  
    Email (send error notification)
    ↓
    Export (error log)
```

### **2. Data Validation Pattern**
```
HTTP Request (get data)
  ↓
Transform (validate required fields)
  ↓
Condition (validation passed)
  ↓ (TRUE)
    Database Query (insert data)
    ↓
    Export (success report)
  ↓ (FALSE)
    Email (send validation error alert)
    ↓
    Export (error report)
```

### **3. Batch Processing Pattern**
```
Schedule (every hour)
  ↓
Database Query (SELECT * FROM queue WHERE processed=0 LIMIT 100)
  ↓
Transform (batch data into groups of 10)
  ↓
HTTP Request (process each batch via API)
  ↓
Database Query (UPDATE queue SET processed=1 WHERE id IN (...))
  ↓
Export (batch processing report)
```

### **4. Monitoring Pattern**
```
Schedule (every 5 minutes)
  ↓
HTTP Request (GET https://api.service.com/health)
  ↓
Condition (status !== "healthy")
  ↓ (TRUE - Service Down)
    Email (alert: "Service is down!")
    ↓
    Database Query (INSERT INTO incidents ...)
  ↓ (FALSE - Service OK)
    Export (health check log)
```

---

## 💡 Tips & Best Practices

### **Performance Optimization**
- Use appropriate scheduling intervals (avoid over-polling APIs)
- Implement data filtering early in workflows to reduce processing load
- Use JSONPath to extract only needed data
- Enable "Continue on Fail" for non-critical operations

### **Error Handling**
- Always include error logging and notification
- Use retry mechanisms for API calls
- Implement validation before database operations
- Create separate error handling branches

### **Security**
- Store sensitive data in environment variables
- Use authentication tokens in headers
- Validate file uploads and downloads
- Implement proper access controls

### **Monitoring**
- Export execution logs for audit trails
- Set up health check workflows
- Monitor file storage usage
- Track API rate limits and usage

---

## 🚀 Getting Started Templates

### **Template 1: Simple Data Export**
1. Add Schedule Node (set your interval)
2. Add HTTP Request Node (your API endpoint)
3. Add Export Node (choose format and filename)
4. Connect: Schedule → HTTP Request → Export
5. Activate workflow

### **Template 2: Email Reports**
1. Add Schedule Node (daily/weekly)
2. Add HTTP Request Node (data source)
3. Add Transform Node (format data) 
4. Add Export Node (create report file)
5. Add Email Node (send report)
6. Connect: Schedule → HTTP Request → Transform → Export → Email
7. Activate workflow

### **Template 3: File Processing**
1. Add Webhook Node (file upload trigger)
2. Add File Download Node (get uploaded file)
3. Add Transform Node (process file data)
4. Add File Upload Node (save processed file)
5. Add Export Node (create processing log)
6. Connect nodes and activate

---

*This document will be updated as new nodes and features are added to the platform.*