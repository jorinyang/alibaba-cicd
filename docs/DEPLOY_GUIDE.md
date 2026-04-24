# 部署指南

## 前置要求

- GitHub账号
- 阿里云账号
- 域名（可选，用于自定义访问地址）

## 第一步：创建GitHub仓库

1. 访问 https://github.com/new
2. 仓库名称: `alibaba-cicd`
3. 选择 Public 或 Private
4. 点击 Create repository

## 第二步：配置阿里云

### 2.1 创建OSS Bucket

1. 登录 [阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 点击"创建Bucket"
3. 配置:
   - Bucket名称: `jorinyang-deploy`（全局唯一）
   - 地域: 华东1（杭州）
   - 存储类型: 标准存储
   - 读写权限: 公共读
4. 点击"确定"

### 2.2 开启静态网站托管

1. 进入Bucket详情
2. 左侧菜单: "基础设置" → "静态页面"
3. 配置:
   - 默认首页: `index.html`
   - 默认404页: `index.html`（SPA需要）
4. 保存

### 2.3 配置CDN（可选）

1. 进入 [CDN控制台](https://cdn.console.aliyun.com/)
2. 添加域名
3. 源站选择OSS域名

## 第三步：配置GitHub Secrets

1. 进入GitHub仓库
2. Settings → Secrets and variables → Actions
3. 添加以下Secrets:

| 名称 | 值 |
|-----|-----|
| `ALIYUN_ACCESS_KEY_ID` | ${ALIYUN_ACCESS_KEY_ID} |
| `ALIYUN_ACCESS_KEY_SECRET` | ${ALIYUN_ACCESS_KEY_SECRET} |
| `OSS_BUCKET` | jorinyang-deploy |
| `OSS_ENDPOINT` | oss-cn-hangzhou.aliyuncs.com |

## 第四步：推送代码

```bash
# 克隆仓库
git clone https://github.com/jorinyang/alibaba-cicd.git
cd alibaba-cicd

# 复制本项目的文件到仓库
# ...

# 提交并推送
git add .
git commit -m "init: CI/CD配置"
git push origin main
```

## 第五步：验证部署

1. 进入GitHub仓库 → Actions
2. 查看工作流运行状态
3. 等待部署完成
4. 访问: `http://jorinyang-deploy.oss-cn-hangzhou.aliyuncs.com/static-demo/`

## 添加新项目

```bash
# 创建项目目录
mkdir projects/my-new-project
cd projects/my-new-project

# 如果是React项目
npx create-react-app .

# 如果是静态网站
echo '<h1>My Site</h1>' > index.html

# 提交代码
git add .
git commit -m "add: my-new-project"
git push origin main

# 自动部署！
```

## 故障排查

### 部署失败

1. 检查GitHub Actions日志
2. 确认Secrets配置正确
3. 检查阿里云权限

### 访问404

1. 确认OSS Bucket权限为"公共读"
2. 检查文件是否上传成功
3. 确认静态网站托管已开启

## 成本监控

- [阿里云费用中心](https://expense.console.aliyun.com/)
- 预估月费用: 50-100元
