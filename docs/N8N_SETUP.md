# n8n 自动化部署工作流配置指南

> 更新时间: 2026-04-27

## 概述

n8n工作流实现从GitHub Push到健康检查的全流程自动化部署。

## 架构图

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GitHub     │────▶│  n8n Webhook     │────▶│  Vercel健康检查 │
│  Push       │     │  (clawshell-     │     │                 │
└─────────────┘     │  deploy)         │     └────────┬────────┘
                    └──────────────────┘              │
                                                     ▼
                    ┌──────────────────┐     ┌─────────────────┐
                    │  发送部署通知     │◀────│  条件分支       │
                    │  (钉钉/Discord)  │     │  Vercel可用?    │
                    └────────┬─────────┘     └────────┬────────┘
                             │                       │
              ┌──────────────┴──────────────┐       │
              ▼                              ▼       ▼
    ┌─────────────────┐            ┌─────────────────┐
    │  部署到Vercel   │            │ 部署到OSS香港   │
    └────────┬────────┘            └────────┬────────┘
             │                              │
             └──────────────┬───────────────┘
                            ▼
                  ┌─────────────────┐
                  │  FC香港健康检查  │
                  └────────┬────────┘
                           ▼
                  ┌─────────────────┐
                  │  发送成功通知   │
                  └─────────────────┘
```

## n8n节点配置

### 1. Webhook节点

```yaml
名称: GitHub Webhook
类型: webhook
路径: clawshell-deploy
方法: POST
```

### 2. 健康检查节点

```yaml
名称: Vercel Health Check
类型: HTTP Request
URL: https://api.vercel.com/v6/deployments
认证: Bearer Token (VERCEL_TOKEN)
```

### 3. 条件分支

```yaml
名称: Switch Deployment Target
条件: vercel_available == true
  ├── true  → Deploy to Vercel
  └── false → Deploy to OSS Hong Kong
```

### 4. 部署节点

**Vercel部署:**
```yaml
URL: https://api.vercel.com/v13/deployments
方法: POST
Body: { name, gitSource: { type: github, repo, ref } }
```

**OSS香港部署:**
```yaml
操作: 执行Python脚本
Bucket: clawshell-backup-hk
Endpoint: oss-cn-hongkong.aliyuncs.com
```

### 5. 通知节点

支持: 钉钉 / Discord / Slack / Email

## 环境变量配置

在n8n中配置以下环境变量:

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VERCEL_TOKEN` | Vercel API Token | `vck_xxx` |
| `ALIYUN_ACCESS_KEY_ID` | 阿里云AK | `LTAI5txxx` |
| `ALIYUN_ACCESS_KEY_SECRET` | 阿里云SK | `xxx` |
| `ALIYUN_ACCOUNT_ID` | 阿里云AccountID | `31463414` |
| `N8N_DINGTALK_WEBHOOK` | 钉钉通知地址 | `https://oapi.dingtalk.com/...` |
| `N8N_DISCORD_WEBHOOK` | Discord通知地址 | `https://discord.com/api/...` |

## GitHub Secrets配置

确保在GitHub仓库中添加以下Secrets:

```bash
# 新增
ALIYUN_ACCOUNT_ID=31463414
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/clawshell-deploy

# 已存在
VERCEL_TOKEN=vck_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx
ALIYUN_ACCESS_KEY_ID=LTAI5txxx
ALIYUN_ACCESS_KEY_SECRET=xxx
OSS_HK_BUCKET=clawshell-backup-hk
OSS_HK_ENDPOINT=oss-cn-hongkong.aliyuncs.com
```

## 导入n8n工作流

### 方式1: 导入JSON

1. 登录n8n控制台
2. 点击 "Workflows" → "Import from JSON"
3. 粘贴 `docs/n8n-workflow.json` 内容
4. 保存工作流

### 方式2: 手动创建

1. 创建Webhook节点
2. 添加HTTP Request节点进行Vercel健康检查
3. 添加Switch节点进行条件分支
4. 添加代码或HTTP节点执行部署
5. 添加通知节点

## 测试工作流

### 本地测试

```bash
# 触发webhook
curl -X POST https://your-n8n.com/webhook/clawshell-deploy \
  -H "Content-Type: application/json" \
  -d '{
    "event": "test",
    "vercel_available": "true",
    "commit": "abc123",
    "branch": "main",
    "repository": "jorinyang/alibaba-cicd"
  }'
```

### GitHub Actions测试

```bash
# 在GitHub仓库页面
Actions → "Auto Deploy - Vercel + Supabase + Aliyun" → Run workflow
```

## 自动触发条件

工作流在以下情况自动触发:

1. **Push到main/master分支** - GitHub Actions自动触发CI/CD
2. **n8n监听GitHub Webhook** - 接收部署事件
3. **定时健康检查** - 可选配置定时检查

## 通知配置

### 钉钉通知

1. 在钉钉群中添加自定义机器人
2. 获取Webhook URL
3. 在n8n中使用"钉钉节点"或HTTP Request发送通知

### Discord通知

1. 在Discord服务器创建Webhook
2. 获取Webhook URL
3. 在n8n中使用"Discord节点"发送通知

## 监控和日志

- n8n提供执行历史和日志
- GitHub Actions提供详细部署日志
- 阿里云FC提供函数执行日志

## 故障排除

| 问题 | 解决方案 |
|------|----------|
| Webhook无法触发 | 检查n8n服务是否运行，检查URL是否可访问 |
| Vercel部署失败 | 检查VERCEL_TOKEN是否有效 |
| OSS上传失败 | 检查OSS权限和凭证 |
| FC健康检查失败 | 检查FC函数是否正常部署 |

## 最佳实践

1. **使用环境变量** - 不要在代码中硬编码凭证
2. **设置超时** - HTTP请求设置合理的超时时间
3. **错误处理** - 添加错误处理节点，避免流程中断
4. **通知告警** - 部署失败时发送告警通知
5. **定期测试** - 定期测试故障切换流程
