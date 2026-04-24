#!/bin/bash
# 构建并部署SPA到OSS - 使用阿里云CLI

PROJECT_DIR="$1"
PROJECT_NAME="$2"
BUCKET="${OSS_BUCKET:-jorinyang-deploy}"
ENDPOINT="${OSS_ENDPOINT:-oss-cn-hangzhou.aliyuncs.com}"

echo "项目: $PROJECT_NAME"
echo "目录: $PROJECT_DIR"

cd "$PROJECT_DIR" || exit 1

# 安装依赖
echo "安装依赖..."
npm ci

# 构建
echo "构建项目..."
npm run build

# 找到构建输出目录
BUILD_DIR=""
if [ -d "dist" ]; then
  BUILD_DIR="dist"
elif [ -d "build" ]; then
  BUILD_DIR="build"
elif [ -d "out" ]; then
  BUILD_DIR="out"
else
  echo "未找到构建输出目录"
  exit 1
fi

echo "构建目录: $BUILD_DIR"

# 使用aliyun CLI上传
if ! command -v aliyun &> /dev/null; then
  echo "安装aliyun CLI..."
  curl -sL -o aliyun-cli.tgz https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz
  tar -xzf aliyun-cli.tgz
  mkdir -p ~/bin
  mv aliyun ~/bin/
  export PATH="$HOME/bin:$PATH"
fi

# 配置凭证
~/bin/aliyun configure set \
  --access-key-id "$ALIYUN_ACCESS_KEY_ID" \
  --access-key-secret "$ALIYUN_ACCESS_KEY_SECRET" \
  --region cn-hangzhou

# 上传构建产物
~/bin/aliyun oss cp "$BUILD_DIR" "oss://$BUCKET/$PROJECT_NAME/" --force

echo "✅ SPA部署完成"
echo "访问地址: http://$BUCKET.$ENDPOINT/$PROJECT_NAME/"
