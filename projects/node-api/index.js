const express = require('express');
const app = express();

app.use(express.json());

// 健康检查
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Node.js API运行正常',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 示例API：获取用户信息
app.get('/api/users', (req, res) => {
  res.json({
    users: [
      { id: 1, name: '用户1' },
      { id: 2, name: '用户2' }
    ]
  });
});

// 示例API：创建用户
app.post('/api/users', (req, res) => {
  const { name } = req.body;
  res.json({
    id: Date.now(),
    name,
    createdAt: new Date().toISOString()
  });
});

// 阿里云函数计算入口
exports.handler = (req, res, context) => {
  app(req, res);
};

// 本地开发
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`API服务运行在 http://localhost:${PORT}`);
  });
}
