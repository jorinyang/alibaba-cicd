#!/bin/bash
# GitHub仓库一键初始化脚本
# 用法: bash setup-github.sh

set -e

REPO_NAME="alibaba-cicd"
GITHUB_USER="jorinyang"
PROJECT_DIR="/Users/yangyang/.openclaw/workspace/projects/alibaba-cicd"

echo "========================================"
echo "  GitHub仓库一键初始化"
echo "========================================"
echo ""

# 1. 检查gh是否安装
if ! command -v gh &> /dev/null; then
    echo "❌ 未安装GitHub CLI (gh)"
    echo "正在安装..."
    brew install gh
fi

echo "✅ GitHub CLI已安装"

# 2. 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo ""
    echo "🔐 需要登录GitHub"
    echo "请选择登录方式:"
    echo "1. 网页浏览器登录（推荐）"
    echo "2. 粘贴Personal Access Token"
    echo ""
    read -p "请选择 [1/2]: " choice
    
    if [ "$choice" == "2" ]; then
        echo ""
        echo "如何获取Token:"
        echo "1. 访问: https://github.com/settings/tokens"
        echo "2. 点击 'Generate new token (classic)'"
        echo "3. 勾选 'repo' 权限"
        echo "4. 生成并复制token"
        echo ""
        read -sp "粘贴你的Token: " token
        echo ""
        echo "$token" | gh auth login --with-token
    else
        echo ""
        echo "即将打开浏览器进行认证..."
        sleep 2
        gh auth login --web
    fi
fi

echo "✅ GitHub登录成功"

# 3. 创建仓库
echo ""
echo "📦 创建仓库: $GITHUB_USER/$REPO_NAME"

if gh repo view "$GITHUB_USER/$REPO_NAME" &> /dev/null; then
    echo "⚠️ 仓库已存在，跳过创建"
else
    gh repo create "$REPO_NAME" \
        --public \
        --description "阿里云Serverless CI/CD平台" \
        --source "$PROJECT_DIR" \
        --remote=origin \
        --push
    echo "✅ 仓库创建成功"
fi

# 4. 设置Secrets
echo ""
echo "🔑 配置GitHub Secrets..."

cd "$PROJECT_DIR"

# 检查是否已有remote
if ! git remote get-url origin &> /dev/null; then
    git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"
fi

# 设置Secrets
gh secret set ALIYUN_ACCESS_KEY_ID --body "${ALIYUN_ACCESS_KEY_ID}"
gh secret set ALIYUN_ACCESS_KEY_SECRET --body "${ALIYUN_ACCESS_KEY_SECRET}"
gh secret set OSS_BUCKET --body "jorinyang-deploy"
gh secret set OSS_ENDPOINT --body "oss-cn-hangzhou.aliyuncs.com"

echo "✅ Secrets配置完成"

# 5. 推送代码
echo ""
echo "📤 推送代码..."

git add .
git commit -m "init: 阿里云CI/CD平台" || true
git push -u origin main || git push -u origin master

echo ""
echo "========================================"
echo "  ✅ 初始化完成！"
echo "========================================"
echo ""
echo "仓库地址: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""
echo "下一步:"
echo "1. 创建OSS Bucket: jorinyang-deploy"
echo "2. 访问仓库查看Actions运行状态"
echo ""
