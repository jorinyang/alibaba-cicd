'use strict';

exports.handler = async (event, context) => {
  // FC3.0 HTTP Trigger 会传递Buffer格式的event
  let parsedEvent = event;
  
  if (Buffer.isBuffer(event)) {
    try {
      parsedEvent = JSON.parse(event.toString());
    } catch (e) {
      parsedEvent = { rawPath: '/', method: 'GET' };
    }
  }
  
  const rawPath = parsedEvent.rawPath || '/';
  const method = parsedEvent.method || 'GET';
  const headers = parsedEvent.headers || {};
  
  console.log('rawPath:', rawPath);
  console.log('method:', method);
  
  // CORS预检
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }
  
  // 路由
  const path = rawPath.replace(/\/$/, '') || '/';
  let response = { message: 'Hello from Hong Kong FC!' };
  let statusCode = 200;
  
  if (path === '/api/health' || path === '/health') {
    response = {
      status: 'ok',
      region: 'cn-hongkong',
      timestamp: new Date().toISOString()
    };
  } else if (path === '/api/supabase-test') {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_KEY;
    
    try {
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      const data = await resp.json();
      response = { 
        status: 'connected', 
        tables: Object.keys(data.paths || {}).slice(0, 5)
      };
    } catch (error) {
      response = { status: 'error', message: error.message };
      statusCode = 500;
    }
  } else if (path === '/api/db-test') {
    response = {
      status: 'ok',
      message: 'Supabase connection OK',
      supabase: process.env.SUPABASE_URL ? 'configured' : 'not configured'
    };
  }
  
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(response)
  };
};
