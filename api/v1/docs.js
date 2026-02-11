// Rate limiting
const rateLimits = new Map();
const RATE_LIMIT_FREE = 50;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / RATE_LIMIT_WINDOW)}`;
  
  const current = rateLimits.get(key) || 0;
  if (current >= RATE_LIMIT_FREE) {
    return { allowed: false, remaining: 0, limit: RATE_LIMIT_FREE };
  }
  
  rateLimits.set(key, current + 1);
  return { allowed: true, remaining: RATE_LIMIT_FREE - current - 1, limit: RATE_LIMIT_FREE };
}

function getClientIP(req) {
  return req.headers['x-forwarded-for'] || 
         req.headers['x-real-ip'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         '127.0.0.1';
}

const apiDoc = {
  "openapi": "3.0.0",
  "info": {
    "title": "Oracle HCM Tables API",
    "description": "REST API for searching Oracle HCM Cloud database tables and columns. Access 35,000+ tables and 1.2M+ columns from Oracle's Human Capital Management suite.",
    "version": "1.0.0",
    "contact": {
      "email": "support@hcm-tables.com"
    },
    "license": {
      "name": "API License",
      "url": "https://hcm-tables.com/api-terms"
    }
  },
  "servers": [
    {
      "url": "https://oracle-hcm-tables.vercel.app/api/v1",
      "description": "Production API"
    }
  ],
  "security": [
    {},
    {
      "ApiKeyAuth": []
    }
  ],
  "components": {
    "securitySchemes": {
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "API key for premium endpoints. Get yours at support@hcm-tables.com"
      }
    },
    "schemas": {
      "Table": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "example": "PER_ALL_PEOPLE_F" },
          "module": { "type": "string", "example": "HCM" },
          "description": { "type": "string", "example": "Person records table" },
          "column_count": { "type": "integer", "example": 127 }
        }
      },
      "TableDetails": {
        "type": "object",
        "properties": {
          "name": { "type": "string", "example": "PER_ALL_PEOPLE_F" },
          "module": { "type": "string", "example": "HCM" },
          "description": { "type": "string", "example": "Person records table" },
          "columns": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string", "example": "PERSON_ID" },
                "type": { "type": "string", "example": "NUMBER" },
                "nullable": { "type": "boolean", "example": true },
                "description": { "type": "string", "example": "Unique person identifier" }
              }
            }
          },
          "related_tables": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "name": { "type": "string", "example": "PER_PERSON_NAMES_F" },
                "shared_columns": { "type": "integer", "example": 15 }
              }
            }
          }
        }
      },
      "Column": {
        "type": "object",
        "properties": {
          "column_name": { "type": "string", "example": "PERSON_ID" },
          "table_name": { "type": "string", "example": "PER_ALL_PEOPLE_F" },
          "data_type": { "type": "string", "example": "NUMBER" },
          "nullable": { "type": "boolean", "example": true }
        }
      },
      "Module": {
        "type": "object",
        "properties": {
          "prefix": { "type": "string", "example": "HCM" },
          "name": { "type": "string", "example": "Human Capital Management" },
          "table_count": { "type": "integer", "example": 2847 }
        }
      },
      "Stats": {
        "type": "object",
        "properties": {
          "total_tables": { "type": "integer", "example": 35602 },
          "total_columns": { "type": "integer", "example": 1201963 },
          "modules": { "type": "integer", "example": 8 },
          "last_updated": { "type": "string", "format": "date", "example": "2026-02-01" },
          "api_version": { "type": "string", "example": "1.0.0" }
        }
      },
      "Error": {
        "type": "object",
        "properties": {
          "error": { "type": "string" },
          "message": { "type": "string" }
        }
      }
    }
  },
  "paths": {
    "/tables": {
      "get": {
        "summary": "Search tables",
        "description": "Search Oracle HCM tables by name, module, or keyword. Free tier: max 10 results.",
        "tags": ["Tables"],
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "description": "Search query for table name or description",
            "schema": { "type": "string" },
            "example": "PER_ALL_PEOPLE"
          },
          {
            "name": "module",
            "in": "query",
            "description": "Filter by module name",
            "schema": { "type": "string" },
            "example": "HCM"
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of results (max 10 free, 100 with API key)",
            "schema": { "type": "integer", "minimum": 1, "maximum": 100 },
            "example": 20
          },
          {
            "name": "offset",
            "in": "query",
            "description": "Pagination offset",
            "schema": { "type": "integer", "minimum": 0 },
            "example": 0
          }
        ],
        "responses": {
          "200": {
            "description": "Search results",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "tables": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/Table" }
                    },
                    "total": { "type": "integer" },
                    "limit": { "type": "integer" },
                    "offset": { "type": "integer" }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/tables/{name}": {
      "get": {
        "summary": "Get table details",
        "description": "Get full details of a specific table including all columns and related tables.",
        "tags": ["Tables"],
        "parameters": [
          {
            "name": "name",
            "in": "path",
            "required": true,
            "description": "Table name (case sensitive)",
            "schema": { "type": "string" },
            "example": "PER_ALL_PEOPLE_F"
          }
        ],
        "responses": {
          "200": {
            "description": "Table details",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/TableDetails" }
              }
            }
          },
          "404": {
            "description": "Table not found",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    },
    "/columns": {
      "get": {
        "summary": "Search columns",
        "description": "Search columns across all tables. Requires API key.",
        "tags": ["Columns"],
        "security": [{ "ApiKeyAuth": [] }],
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "description": "Search query for column name",
            "schema": { "type": "string" },
            "example": "PERSON_ID"
          },
          {
            "name": "table",
            "in": "query",
            "description": "Filter by table name",
            "schema": { "type": "string" },
            "example": "PER_ALL_PEOPLE_F"
          },
          {
            "name": "type",
            "in": "query",
            "description": "Filter by data type",
            "schema": { "type": "string" },
            "example": "NUMBER"
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of results (max 100)",
            "schema": { "type": "integer", "minimum": 1, "maximum": 100 },
            "example": 50
          }
        ],
        "responses": {
          "200": {
            "description": "Column search results",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "columns": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/Column" }
                    },
                    "total": { "type": "integer" }
                  }
                }
              }
            }
          },
          "403": {
            "description": "API key required",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    },
    "/modules": {
      "get": {
        "summary": "List modules",
        "description": "Get all Oracle modules with table counts.",
        "tags": ["Modules"],
        "responses": {
          "200": {
            "description": "Module list",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "modules": {
                      "type": "array",
                      "items": { "$ref": "#/components/schemas/Module" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/stats": {
      "get": {
        "summary": "API statistics",
        "description": "Get API statistics and data freshness information.",
        "tags": ["Stats"],
        "responses": {
          "200": {
            "description": "API statistics",
            "content": {
              "application/json": {
                "schema": { "$ref": "#/components/schemas/Stats" }
              }
            }
          }
        }
      }
    }
  },
  "tags": [
    {
      "name": "Tables",
      "description": "Operations for searching and retrieving table information"
    },
    {
      "name": "Columns", 
      "description": "Operations for searching column information (API key required)"
    },
    {
      "name": "Modules",
      "description": "Operations for retrieving module information"
    },
    {
      "name": "Stats",
      "description": "API statistics and metadata"
    }
  ]
};

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=7200');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const clientIP = getClientIP(req);
  const rateCheck = checkRateLimit(clientIP);
  
  res.setHeader('X-RateLimit-Limit', rateCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateCheck.remaining);
  
  if (!rateCheck.allowed) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: 'Free tier allows 50 requests per day. Upgrade to API key tier for higher limits.' 
    });
  }

  return res.status(200).json(apiDoc);
};