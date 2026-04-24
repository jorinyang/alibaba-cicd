# 数据库设置指南

## PolarDB PostgreSQL 初始化

### 1. 创建数据库（阿里云控制台）

1. 登录 [阿里云PolarDB控制台](https://polardb.console.aliyun.com/)
2. 创建PostgreSQL实例（Serverless版，按量付费）
3. 创建数据库：`workshop_db`
4. 创建账号并授权

### 2. 连接信息

在GitHub Secrets中配置：

```
DB_HOST=your-polardb-endpoint.rwlb.rds.aliyuncs.com
DB_PORT=5432
DB_NAME=workshop_db
DB_USER=your_username
DB_PASSWORD=your_password
```

### 3. 初始化表结构

```bash
# 本地连接测试
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f database/init.sql
```

或直接在阿里云DMS中执行 `database/init.sql` 的内容。

### 4. 表结构说明

| 表名 | 说明 |
|------|------|
| `participants` | 学员信息表 |
| `groups` | 场景组表（10个固定分组） |

### 5. 验证

```bash
curl https://<account-id>.cn-hangzhou.fcapp.run/node-api/health
```

应返回数据库连接状态和当前时间。
