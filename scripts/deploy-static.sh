#!/bin/bash
# 部署静态网站到OSS

PROJECT_DIR="$1"
PROJECT_NAME="$2"
BUCKET="${OSS_BUCKET:-jorinyang-deploy}"
ENDPOINT="${OSS_ENDPOINT:-oss-cn-hangzhou.aliyuncs.com}"

echo "项目: $PROJECT_NAME"
echo "目录: $PROJECT_DIR"
echo "Bucket: $BUCKET"

# 安装ossutil（使用curl替代wget）
if ! command -v ossutil &> /dev/null; then
  echo "安装ossutil..."
  curl -sL -o ossutil64 http://gosspublic.alicdn.com/ossutil/1.7.19/ossutil64
  chmod 755 ossutil64
  mkdir -p ~/bin
  mv ossutil64 ~/bin/ossutil
  export PATH="$HOME/bin:$PATH"
fi

# 配置ossutil
~/bin/ossutil config -e "$ENDPOINT" -i "$ALIYUN_ACCESS_KEY_ID" -k "$ALIYUN_ACCESS_KEY_SECRET" -L CH -c ~/.ossutilconfig

# 上传文件
~/bin/ossutil cp -r "$PROJECT_DIR" "oss://$BUCKET/$PROJECT_NAME/" --force -c ~/.ossutilconfig

echo "✅ 静态网站部署完成"
echo "访问地址: http://$BUCKET.$ENDPOINT/$PROJECT_NAME/"
