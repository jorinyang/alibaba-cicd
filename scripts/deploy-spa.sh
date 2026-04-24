#!/bin/bash
# 构建并部署SPA到OSS

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

# 安装ossutil
if ! command -v ossutil &> /dev/null; then
  echo "安装ossutil..."
  wget -q https://gosspublic.alicdn.com/ossutil/1.7.19/ossutil64
  chmod 755 ossutil64
  sudo mv ossutil64 /usr/local/bin/ossutil
fi

# 配置ossutil
ossutil config -e "$ENDPOINT" -i "$ALIYUN_ACCESS_KEY_ID" -k "$ALIYUN_ACCESS_KEY_SECRET" -L CH

# 上传构建产物
ossutil cp -r "$BUILD_DIR" "oss://$BUCKET/$PROJECT_NAME/" --force

echo "✅ SPA部署完成"
echo "访问地址: http://$BUCKET.$ENDPOINT/$PROJECT_NAME/"
