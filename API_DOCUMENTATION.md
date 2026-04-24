# Workshop API 文档

## 基础信息

- **Base URL**: `https://<account-id>.cn-hangzhou.fcapp.run/node-api`
- **协议**: HTTPS
- **数据格式**: JSON
- **CORS**: 已启用（`*`）

## 接口列表

### 1. 健康检查

```http
GET /health
```

**响应**:
```json
{
  "status": "ok",
  "service": "workshop-api",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "dbConnected": true,
  "dbTime": "2024-01-01T00:00:00.000Z"
}
```

### 2. 学员管理

#### 获取学员列表

```http
GET /api/participants
```

**响应**:
```json
{
  "participants": [
    {
      "id": "uuid",
      "participant_name": "张三",
      "first_choice": "线下销售",
      "second_choice": "客户服务",
      "group_id": 1,
      "registration_time": "2024-01-01T00:00:00.000Z",
      "group_name": "线下销售"
    }
  ]
}
```

#### 添加学员

```http
POST /api/participants
Content-Type: application/json

{
  "participant_name": "张三",
  "first_choice": "线下销售",
  "second_choice": "客户服务"
}
```

**响应**:
```json
{
  "participant": {
    "id": "uuid",
    "participant_name": "张三",
    "first_choice": "线下销售",
    "second_choice": "客户服务",
    "group_id": null,
    "registration_time": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. 分组管理

#### 获取分组结果

```http
GET /api/groups
```

**响应**:
```json
{
  "groups": [
    {
      "id": 1,
      "group_name": "线下销售",
      "max_capacity": 10,
      "current_count": 5,
      "members": [
        {
          "id": "uuid",
          "participant_name": "张三",
          "first_choice": "线下销售",
          "second_choice": "客户服务"
        }
      ]
    }
  ]
}
```

#### 执行分组

```http
POST /api/groups/assign
```

**响应**:
```json
{
  "message": "Assigned 20 participants",
  "assignments": [
    {
      "id": "uuid",
      "participant_name": "张三",
      "group_id": 1
    }
  ]
}
```

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 404 | 接口不存在 |
| 405 | 方法不允许 |
| 500 | 服务器内部错误 |

## 本地开发

```bash
cd projects/node-api
npm install

# 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=workshop_db
export DB_USER=postgres
export DB_PASSWORD=password

# 启动本地服务器
npm run dev
```

访问 http://localhost:3000/health 测试。
