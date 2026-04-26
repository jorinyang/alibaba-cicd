# ClawShell 部署配置总结

> 更新时间: 2026-04-26

## ✅ 已完成配置

### 1. GitHub Secrets (已配置)

| Secret名称 | 值 |
|-----------|-----|
| `VERCEL_TOKEN` | `vck_xxxxxx` (已在GitHub Secrets中配置) |
| `SUPABASE_URL` | `https://mqsqcpkcmcgwbzcsmrlm.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJhbGci...` (已在GitHub Secrets中配置) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGci...` (已在GitHub Secrets中配置) |
| `OSS_HK_BUCKET` | `clawshell-backup-hk` |
| `OSS_HK_ENDPOINT` | `oss-cn-hongkong.aliyuncs.com` |
| `ALIYUN_ACCESS_KEY_ID` | `LTAI5tFk9VFxcwKiyqgSCska` |
| `ALIYUN_ACCESS_KEY_SECRET` | `xxxxxx` (已在GitHub Secrets中配置) |
| `OSS_BUCKET` | (阿里云大陆节点) |
| `OSS_ENDPOINT` | (阿里云大陆节点) |
| 数据库相关 | PolarDB连接信息 |

### 2. 阿里云OSS香港节点 (已创建)

```
Bucket: clawshell-backup-hk
Region: cn-hongkong
Endpoint: oss-cn-hongkong.aliyuncs.com
Website: https://clawshell-backup-hk.oss-cn-hongkong.aliyuncs.com
CORS: ✅ 已配置
静态托管: ✅ 已配置
```

### 3. CI/CD工作流 (已更新)

新的 `deploy.yml` 包含:

1. **Vercel健康检查** - 检测Vercel可用性
2. **Supabase配置** - 数据库连接测试
3. **条件部署逻辑**:
   - Vercel可用 → 部署到Vercel
   - Vercel不可用 → 自动切换到OSS香港节点
4. **n8n webhook触发** - 部署完成后通知

## 🔄 自动故障切换流程

```
Git Push
    ↓
Vercel健康检查
    ↓
┌─────────────────────────────────────┐
│  Vercel可用?                         │
├──────────────┬──────────────────────┤
│   YES        │   NO                 │
│   ↓          │   ↓                  │
│ 部署到Vercel │ 部署到OSS香港节点    │
│              │                      │
│              │ 📧 发送告警通知      │
└──────────────┴──────────────────────┘
    ↓
触发n8n工作流 (可选)
    ↓
部署完成通知
```

## 🌐 域名配置建议

### clawshell.online / clawshell.club

| 用途 | 指向 |
|------|------|
| 前端 | Vercel (主要) 或 OSS香港 (备份) |
| API | 阿里云FC |

### Vercel域名绑定

在Vercel Dashboard中:
1. Import Project → 选择 `alibaba-cicd`
2. Configure Project → 设置 `vercel.json`
3. Domains → 添加 `clawshell.online`

### OSS香港域名绑定

1. 阿里云OSS控制台 → Bucket → 域名管理
2. 绑定自定义域名: `clawshell.online`
3. 配置CNAME: `clawshell.online` → `clawshell-backup-hk.oss-cn-hongkong.aliyuncs.com`

## 📋 下一步操作

### 1. Vercel项目配置

访问 https://vercel.com/dashboard
- Import: `https://github.com/jorinyang/alibaba-cicd`
- Framework Preset: 根据项目自动检测
- Build Command: `npm run build` (或自动)
- Output Directory: `dist` 或 `build`

### 2. 添加Domains

在Vercel项目中添加:
- `clawshell.online`
- `clawshell.club`

### 3. 配置环境变量 (Vercel)

在Vercel项目Settings → Environment Variables中添加:
```
SUPABASE_URL = https://mqsqcpkcmcgwbzcsmrlm.supabase.co
SUPABASE_ANON_KEY = eyJhbGci...
```

### 4. n8n工作流配置

创建n8n工作流:
1. Webhook触发
2. 健康检查节点 (检查Vercel)
3. 条件分支:
   - 可用 → Vercel部署
   - 不可用 → OSS香港部署 + 告警
4. 通知节点 (钉钉/Discord)

## 🧪 测试验证

### 手动触发CI/CD

```bash
# 在GitHub仓库页面
Actions → "Auto Deploy - Vercel + Supabase + Aliyun" → Run workflow
```

### 验证Vercel部署

```
https://workshop-grouping.vercel.app
https://react-app.vercel.app
```

### 验证OSS香港备份

```
https://clawshell-backup-hk.oss-cn-hongkong.aliyuncs.com/workshop-grouping/
```

### 验证Supabase连接

```bash
curl https://mqsqcpkcmcgwbzcsmrlm.supabase.co/rest/v1/ \
  -H "apikey: <ANON_KEY>" \
  -H "Authorization: Bearer <ANON_KEY>"
```
