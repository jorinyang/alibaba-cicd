#!/bin/bash
# 部署Node.js API到函数计算

PROJECT_DIR="$1"
PROJECT_NAME="$2"

echo "项目: $PROJECT_NAME"
echo "目录: $PROJECT_DIR"

cd "$PROJECT_DIR" || exit 1

# 安装Serverless Devs
if ! command -v s &> /dev/null; then
  echo "安装Serverless Devs..."
  npm install -g @serverless-devs/s
fi

# 配置s
s config add --AccessKeyID "$ALIYUN_ACCESS_KEY_ID" --AccessKeySecret "$ALIYUN_ACCESS_KEY_SECRET" -a default

# 创建s.yaml（如果不存在）
if [ ! -f "s.yaml" ]; then
  cat > s.yaml << EOF
edition: 3.0.0
name: $PROJECT_NAME
access: default

vars:
  region: cn-hangzhou

resources:
  $PROJECT_NAME:
    component: fc3
    props:
      region: \${vars.region}
      functionName: $PROJECT_NAME
      runtime: nodejs18
      code: ./
      handler: index.handler
      memorySize: 512
      timeout: 30
      environmentVariables:
        NODE_ENV: production
EOF
fi

# 部署
s deploy

echo "✅ API部署完成"
