const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// CORS响应头
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

// 分组算法
function assignGroups(participants, groups) {
  const assignments = new Map();
  const groupCounts = new Map(groups.map(g => [g.id, 0]));
  
  participants.forEach(p => {
    const firstChoice = groups.find(g => g.group_name === p.first_choice);
    if (firstChoice && groupCounts.get(firstChoice.id) < firstChoice.max_capacity) {
      assignments.set(p.id, firstChoice.id);
      groupCounts.set(firstChoice.id, groupCounts.get(firstChoice.id) + 1);
    }
  });
  
  participants.filter(p => !assignments.has(p.id)).forEach(p => {
    const secondChoice = groups.find(g => g.group_name === p.second_choice);
    if (secondChoice && groupCounts.get(secondChoice.id) < secondChoice.max_capacity) {
      assignments.set(p.id, secondChoice.id);
      groupCounts.set(secondChoice.id, groupCounts.get(secondChoice.id) + 1);
    }
  });
  
  participants.filter(p => !assignments.has(p.id)).forEach(p => {
    const minGroup = groups
      .filter(g => groupCounts.get(g.id) < g.max_capacity)
      .sort((a, b) => groupCounts.get(a.id) - groupCounts.get(b.id))[0];
    if (minGroup) {
      assignments.set(p.id, minGroup.id);
      groupCounts.set(minGroup.id, groupCounts.get(minGroup.id) + 1);
    }
  });
  
  return assignments;
}

// FC3 HTTP 触发器响应格式
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
    isBase64Encoded: false
  };
}

// 主处理函数
async function handleRequest(method, path, body) {
  console.log(`[${new Date().toISOString()}] ${method} ${path}`);

  if (method === 'OPTIONS') {
    return formatResponse(204, {});
  }

  try {
    switch (path) {
      case '/init': {
        if (method !== 'POST') break;
        await pool.query(`
          CREATE TABLE IF NOT EXISTS participants (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            participant_name TEXT NOT NULL,
            first_choice TEXT NOT NULL,
            second_choice TEXT NOT NULL,
            group_id INTEGER,
            registration_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);
        await pool.query(`
          CREATE TABLE IF NOT EXISTS groups (
            id SERIAL PRIMARY KEY,
            group_name TEXT NOT NULL UNIQUE,
            max_capacity INTEGER DEFAULT 10,
            current_count INTEGER DEFAULT 0
          )
        `);
        await pool.query(`
          INSERT INTO groups (group_name, max_capacity, current_count) VALUES
            ('线下销售', 10, 0), ('线上销售', 10, 0), ('行政管理', 10, 0),
            ('客户服务', 10, 0), ('制造管理', 10, 0), ('财务管理', 10, 0),
            ('人力资源', 10, 0), ('项目管理', 10, 0), ('经营分析', 10, 0),
            ('生产管理', 10, 0)
          ON CONFLICT (group_name) DO NOTHING
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_participants_first_choice ON participants(first_choice)`);
        return formatResponse(200, { message: 'Database initialized' });
      }

      case '/':
      case '/health': {
        return formatResponse(200, { status: 'ok', service: 'workshop-api', timestamp: new Date().toISOString() });
      }

      case '/api/participants': {
        if (method === 'GET') {
          const result = await pool.query(`
            SELECT p.*, g.group_name 
            FROM participants p 
            LEFT JOIN groups g ON p.group_id = g.id 
            ORDER BY p.registration_time DESC
          `);
          return formatResponse(200, { participants: result.rows });
        }
        
        if (method === 'POST') {
          const { participant_name, first_choice, second_choice } = body;
          if (!participant_name || !first_choice || !second_choice) {
            return formatResponse(400, { error: 'Missing required fields' });
          }
          
          const result = await pool.query(
            `INSERT INTO participants (participant_name, first_choice, second_choice) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [participant_name, first_choice, second_choice]
          );
          return formatResponse(201, { participant: result.rows[0] });
        }
        break;
      }

      case '/api/groups': {
        if (method === 'GET') {
          const result = await pool.query(`
            SELECT g.*, COUNT(p.id) as participant_count
            FROM groups g
            LEFT JOIN participants p ON p.group_id = g.id
            GROUP BY g.id
            ORDER BY g.id
          `);
          return formatResponse(200, { groups: result.rows });
        }
        break;
      }

      case '/api/groups/assign': {
        if (method === 'POST') {
          const participants = (await pool.query('SELECT * FROM participants')).rows;
          const groups = (await pool.query('SELECT * FROM groups')).rows;
          
          const assignments = assignGroups(participants, groups);
          
          const updates = [];
          for (const [participantId, groupId] of assignments) {
            updates.push(
              pool.query(
                'UPDATE participants SET group_id = $1 WHERE id = $2 RETURNING *',
                [groupId, participantId]
              )
            );
          }
          
          const updated = await Promise.all(updates);
          
          return formatResponse(200, {
            message: `Assigned ${assignments.size} participants`,
            assignments: updated.map(r => r.rows[0])
          });
        }
        break;
      }

      default:
        return formatResponse(404, { error: 'Not found', path });
    }

    return formatResponse(405, { error: 'Method not allowed', method, path });

  } catch (error) {
    console.error('API Error:', error);
    return formatResponse(500, {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// FC3 HTTP 触发器入口
exports.handler = async (event, context) => {
  // 解析 FC3 HTTP 事件格式
  let method, path, body = {};
  
  if (event.requestContext && event.requestContext.http) {
    // FC3 HTTP 触发器格式
    method = event.requestContext.http.method;
    path = event.requestContext.http.path || '/';
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
  } else {
    // 本地开发兼容格式
    method = event.httpMethod || 'GET';
    path = event.path || '/';
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
  }

  return handleRequest(method, path, body);
};

// 本地开发服务器
if (require.main === module) {
  const http = require('http');
  const PORT = process.env.PORT || 3000;
  
  const server = http.createServer(async (req, res) => {
    let rawBody = '';
    req.on('data', chunk => rawBody += chunk);
    req.on('end', async () => {
      const body = rawBody ? JSON.parse(rawBody) : {};
      const result = await handleRequest(req.method, req.url, body);
      
      res.writeHead(result.statusCode, result.headers);
      res.end(result.body);
    });
  });
  
  server.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}
