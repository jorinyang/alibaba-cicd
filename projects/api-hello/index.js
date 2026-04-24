const { Pool } = require('pg');

// Database connection (configured via environment variables)
const pool = process.env.DB_HOST ? new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
}) : null;

exports.handler = async (event, context) => {
  const method = event.httpMethod || 'GET';
  const path = event.path || '/';
  
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };
  
  // Handle preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  try {
    switch (path) {
      case '/':
      case '/health':
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'ok',
            service: 'api-hello',
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            requestId: context.requestId,
            dbConnected: !!pool
          })
        };
        
      case '/db-test':
        if (!pool) {
          return {
            statusCode: 503,
            headers,
            body: JSON.stringify({ error: 'Database not configured' })
          };
        }
        const result = await pool.query('SELECT NOW() as time, version() as version');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            dbTime: result.rows[0].time,
            dbVersion: result.rows[0].version
          })
        };
        
      default:
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Not found', path })
        };
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
