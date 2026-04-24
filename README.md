# 阿里云Serverless CI/CD

> 全自动部署平台 - 支持静态网站、React、Node.js

## 🚀 快速开始

### 1. 配置GitHub Secrets

在仓库 Settings → Secrets → Actions 中添加：

| Secret名称 | 值 |
|-----------|-----|
| `ALIYUN_ACCESS_KEY_ID` | 你的阿里云AccessKey ID |
| `ALIYUN_ACCESS_KEY_SECRET` | 你的阿里云AccessKey Secret |
| `OSS_BUCKET` | OSS Bucket名称 |
| `OSS_ENDPOINT` | OSS Endpoint (如 oss-cn-hangzhou.aliyuncs.com) |

### 2. 创建项目

```bash
# 静态网站
mkdir projects/my-static-site
cd projects/my-static-site
echo '<h1>Hello World</h1>' > index.html

# 或 React项目
npx create-react-app projects/my-react-app

# 或 Node.js API
mkdir projects/my-api
cd projects/my-api
npm init -y
npm install express
```

### 3. 推送代码

```bash
git add .
git commit -m "init project"
git push origin main
```

### 4. 自动部署

GitHub Actions会自动检测项目类型并部署到阿里云。

---

## 📁 项目结构

```
.
├── .github/
│   └── workflows/
│       └── deploy.yml          # CI/CD主配置
├── scripts/
│   ├── detect-type.sh          # 项目类型检测
│   └── deploy.sh              # 部署脚本
├── projects/                   # 你的项目目录
│   ├── static-demo/           # 静态网站示例
│   ├── react-app/             # React应用示例
│   └── node-api/              # Node.js API示例
└── docs/
    ├── ARCHITECTURE.md        # 架构设计
    └── DEPLOY_GUIDE.md        # 部署指南
```

---

## 🏗️ 架构

```
GitHub Repo
    ↓
GitHub Actions (自动检测类型)
    ↓
┌─────────────────────────────────────┐
│  静态网站 → OSS + CDN               │
│  React/Vue → OSS + CDN              │
│  Node.js API → 函数计算 FC          │
└─────────────────────────────────────┘
```

---

## 💰 成本预估

| 服务 | 月成本 |
|------|--------|
| OSS | ~10元 |
| CDN | ~15元 |
| 函数计算 | ~20-50元 |
| **总计** | **~45-75元** |

---

## 📖 文档

- [架构设计](docs/ARCHITECTURE.md)
- [部署指南](docs/DEPLOY_GUIDE.md)
- [项目类型说明](docs/PROJECT_TYPES.md)

---

*由OpenClaw自动生成*
