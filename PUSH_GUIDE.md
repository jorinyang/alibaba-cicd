# 推送指南

## 快速开始

### 1. 在GitHub创建仓库

访问: https://github.com/new

- Repository name: `alibaba-cicd`
- Description: 阿里云Serverless CI/CD平台
- Visibility: Public 或 Private
- 勾选: Add a README file
- 点击: **Create repository**

### 2. 克隆仓库到本地

```bash
git clone https://github.com/jorinyang/alibaba-cicd.git
cd alibaba-cicd
```

### 3. 复制项目文件

将 `/Users/yangyang/.openclaw/workspace/projects/alibaba-cicd/` 下的所有文件复制到克隆的仓库中。

```bash
# 假设项目文件在 ~/projects/alibaba-cicd/
cp -r ~/projects/alibaba-cicd/* .
```

### 4. 提交代码

```bash
git add .
git commit -m "init: 阿里云CI/CD平台"
git push origin main
```

### 5. 配置GitHub Secrets

进入仓库 → Settings → Secrets and variables → Actions → New repository secret

添加以下Secrets:

| Secret名称 | 值 |
|-----------|-----|
| `ALIYUN_ACCESS_KEY_ID` | ${ALIYUN_ACCESS_KEY_ID} |
| `ALIYUN_ACCESS_KEY_SECRET` | ${ALIYUN_ACCESS_KEY_SECRET} |
| `OSS_BUCKET` | jorinyang-deploy |
| `OSS_ENDPOINT` | oss-cn-hangzhou.aliyuncs.com |

### 6. 创建OSS Bucket

1. 登录 [阿里云OSS控制台](https://oss.console.aliyun.com/)
2. 创建Bucket:
   - 名称: `jorinyang-deploy`
   - 地域: 华东1(杭州)
   - 权限: 公共读
3. 开启静态网站托管

### 7. 触发首次部署

```bash
# 修改任意文件触发部署
echo "# 部署测试" >> README.md
git add .
git commit -m "test: 触发首次部署"
git push origin main
```

### 8. 查看部署结果

1. 进入GitHub仓库 → Actions 标签
2. 查看工作流运行状态
3. 访问: `http://jorinyang-deploy.oss-cn-hangzhou.aliyuncs.com/static-demo/`

---

## 添加新项目

```bash
# 创建项目目录
mkdir projects/my-project

# 添加你的代码
cp -r /path/to/your/code/* projects/my-project/

# 提交并推送
git add .
git commit -m "add: my-project"
git push origin main

# 自动部署！
```

---

## 常见问题

### Q: 部署失败怎么办？
A: 查看GitHub Actions日志，检查Secrets配置是否正确。

### Q: 如何更新已部署的项目？
A: 修改代码后push到main分支，自动重新部署。

### Q: 如何删除已部署的项目？
A: 在OSS控制台手动删除对应目录。

### Q: 支持哪些项目类型？
A: 静态网站、React/Vue/Next.js、Node.js API。详见 docs/PROJECT_TYPES.md。
