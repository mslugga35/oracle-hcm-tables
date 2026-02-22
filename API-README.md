# Oracle HCM Tables API v1

REST API for searching Oracle HCM Cloud database tables and columns. Access 35,000+ tables and 1.2M+ columns.

## Base URL
```
https://oracle-hcm-tables.vercel.app/api/v1
```

## Endpoints

### 🔍 Search Tables
```
GET /api/v1/tables
```
**Parameters:**
- `q` - Search query for table name or description
- `module` - Filter by module (e.g., "HCM", "FIN")
- `limit` - Results limit (max 10 free, 100 with API key)
- `offset` - Pagination offset

**Example:**
```bash
curl "https://oracle-hcm-tables.vercel.app/api/v1/tables?q=PER_ALL_PEOPLE&limit=5"
```

### 📋 Get Table Details
```
GET /api/v1/tables/[name]
```
**Example:**
```bash
curl "https://oracle-hcm-tables.vercel.app/api/v1/tables/PER_ALL_PEOPLE_F"
```

### 🔍 Search Columns (API Key Required)
```
GET /api/v1/columns
```
**Headers:** `X-API-Key: your-api-key`

**Parameters:**
- `q` - Column name search
- `table` - Filter by table name
- `type` - Filter by data type (NUMBER, VARCHAR2, etc.)
- `limit` - Results limit (max 100)

### 📊 List Modules
```
GET /api/v1/modules
```
Returns all Oracle modules with table counts.

### 📈 API Statistics
```
GET /api/v1/stats
```
Returns API statistics and data freshness.

### 📚 API Documentation
```
GET /api/v1/docs
```
Returns full OpenAPI/Swagger specification.

## Rate Limiting

### Free Tier
- 50 requests/day per IP
- Max 10 results per request
- Basic endpoints only (tables, modules, stats, docs)

### API Key Tier ($10/month)
- 10,000 requests/day
- Max 100 results per request
- Full access to all endpoints
- Column search capabilities

**Headers returned:**
- `X-RateLimit-Limit` - Daily limit
- `X-RateLimit-Remaining` - Remaining requests

## Example Responses

### Tables Search
```json
{
  "tables": [
    {
      "name": "PER_ALL_PEOPLE_F",
      "module": "HCM",
      "description": "Person records table",
      "column_count": 127
    }
  ],
  "total": 1,
  "limit": 10,
  "offset": 0
}
```

### Table Details
```json
{
  "name": "PER_ALL_PEOPLE_F",
  "module": "HCM", 
  "description": "Person records table",
  "columns": [
    {
      "name": "PERSON_ID",
      "type": "NUMBER",
      "nullable": true,
      "description": ""
    }
  ],
  "related_tables": []
}
```

## Error Responses

```json
{
  "error": "Rate limit exceeded",
  "message": "Free tier allows 50 requests per day. Upgrade to API key tier for higher limits."
}
```

## Getting Started

1. **Free tier**: Start making requests immediately (no signup required)
2. **API key**: Contact support@hcm-tables.com for premium access
3. **Documentation**: Visit `/api/v1/docs` for full OpenAPI spec

## CORS & Caching

- CORS enabled for all origins
- Response caching: 5-60 minutes depending on endpoint
- JSON responses with proper error handling