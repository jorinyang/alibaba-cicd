const { Pool } = require('pg');

// 数据库连接配置
// 本地开发：从环境变量读取
// FC生产环境：通过s.yaml的environmentVariables注入
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false } // 阿里云PolarDB需要SSL
});

// CORS响应头
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

// 统一响应封装
const response = (statusCode, body) => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body)
});

// 分组算法（基于 workshop-grouping/src/lib/groupingAlgorithm.ts 的逻辑）
function assignGroups(participants, groups) {
  // 初始化分组结果
  const assignments = new Map();
  const groupCounts = new Map(groups.map(g => [g.id, 0]));
  
  // 按第一志愿分组
  participants.forEach(p => {
    const firstChoiceGroup = groups.find(g => g.group_name === p.first_choice);
    if (firstChoiceGroup && groupCounts.get(firstChoiceGroup.id) < firstChoiceGroup.max_capacity) {
      assignments.set(p.id, firstChoiceGroup.id);
      groupCounts.set(firstChoiceGroup.id, groupCounts.get(firstChoiceGroup.id) + 1);
    }
  });
  
  // 第一志愿未满的，按第二志愿分配
  participants.filter(p => !assignments.has(p.id)).forEach(p => {
    const secondChoiceGroup = groups.find(g => g.group_name === p.second_choice);
    if (secondChoiceGroup && groupCounts.get(secondChoiceGroup.id) < secondChoiceGroup.max_capacity) {
      assignments.set(p.id, secondChoiceGroup.id);
      groupCounts.set(secondChoiceGroup.id, groupCounts.get(secondChoiceGroup.id) + 1);
    }
  });
  
  // 仍未分配的，分配到人数最少的组
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

// FC Handler（阿里云函数计算入口）
exports.handler = async (event, context) => {
  const method = event.httpMethod || event.requestContext?.http?.method || 'GET';
  const path = event.path || event.rawPath || '/';
  const body = event.body ? JSON.parse(event.body) : {};

  // 处理预检请求
  if (method === 'OPTIONS') {
    return response(204, {});
  }

  try {
    switch (path) {
      // 健康检查
      case '/init':
        if (method !== 'POST') break;
        // 自动初始化数据库表
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
        // 初始化10个场景组
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
        return response(200, { message: 'Database initialized', tables: ['participants', 'groups'] });

      case '/':
      case '/health': {
        const dbResult = await pool.query('SELECT NOW() as time');
        return response(200, {
          status: 'ok',
          service: 'workshop-api',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          dbConnected: true,
          dbTime: dbResult.rows[0].time
        });
      }

      // 获取学员列表
      case '/api/participants': {
        if (method === 'GET') {
          const result = await pool.query(`
            SELECT p.*, g.group_name 
            FROM participants p 
            LEFT JOIN groups g ON p.group_id = g.id 
            ORDER BY p.registration_time DESC
          `);
          return response(200, { participants: result.rows });
        }
        
        if (method === 'POST') {
          const { participant_name, first_choice, second_choice } = body;
          if (!participant_name || !first_choice || !second_choice) {
            return response(400, { error: 'Missing required fields' });
          }
          
          const result = await pool.query(
            `INSERT INTO participants (participant_name, first_choice, second_choice) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [participant_name, first_choice, second_choice]
          );
          return response(201, { participant: result.rows[0] });
        }
        break;
      }

      // 获取分组结果
      case '/api/groups': {
        const result = await pool.query(`
          SELECT g.*, 
                 COALESCE(json_agg(
                   json_build_object(
                     'id', p.id,
                     'participant_name', p.participant_name,
                     'first_choice', p.first_choice,
                     'second_choice', p.second_choice
                   ) ORDER BY p.registration_time
                 ) FILTER (WHERE p.id IS NOT NULL), '[]') as members
          FROM groups g
          LEFT JOIN participants p ON g.id = p.group_id
          GROUP BY g.id
          ORDER BY g.id
        `);
        return response(200, { groups: result.rows });
      }

      // 执行分组算法
      case '/api/groups/assign': {
        if (method !== 'POST') break;
        
        // 获取所有学员和分组
        const [participantsResult, groupsResult] = await Promise.all([
          pool.query('SELECT * FROM participants WHERE group_id IS NULL'),
          pool.query('SELECT * FROM groups')
        ]);
        
        const participants = participantsResult.rows;
        const groups = groupsResult.rows;
        
        if (participants.length === 0) {
          return response(200, { message: 'No unassigned participants', assignments: [] });
        }
        
        // 执行分组
        const assignments = assignGroups(participants, groups);
        
        // 批量更新
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
        
        return response(200, {
          message: `Assigned ${assignments.size} participants`,
          assignments: updated.map(r => r.rows[0])
        });
      }

      default:
        return response(404, { error: 'Not found', path });
    }

    return response(405, { error: 'Method not allowed', method, path });

  } catch (error) {
    console.error('API Error:', error);
    return response(500, {
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// 本地开发服务器
if (require.main === module) {
  const http = require('http');
  const PORT = process.env.PORT || 3000;
  
  const server = http.createServer(async (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const event = {
        httpMethod: req.method,
        path: req.url,
        body: body || undefined
      };
      
      const result = await exports.handler(event, {});
      
      res.writeHead(result.statusCode, result.headers);
      res.end(result.body);
    });
  });
  
  server.listen(PORT, () => {
    console.log(`🚀 API server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
  });
}
