#!/bin/bash
# 部署静态网站到OSS - 使用阿里云CLI

PROJECT_DIR="$1"
PROJECT_NAME="$2"
BUCKET="${OSS_BUCKET:-jorinyang-deploy}"
ENDPOINT="${OSS_ENDPOINT:-oss-cn-hangzhou.aliyuncs.com}"

echo "项目: $PROJECT_NAME"
echo "目录: $PROJECT_DIR"
echo "Bucket: $BUCKET"

# 安装并配置aliyun CLI
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

# 使用aliyun oss命令上传
# 注意：aliyun CLI的oss命令格式
~/bin/aliyun oss cp "$PROJECT_DIR" "oss://$BUCKET/$PROJECT_NAME/" --force

echo "✅ 静态网站部署完成"
echo "访问地址: http://$BUCKET.$ENDPOINT/$PROJECT_NAME/"
