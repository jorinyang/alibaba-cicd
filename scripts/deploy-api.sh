#!/bin/bash
# 部署Node.js API到函数计算

PROJECT_DIR="$1"
PROJECT_NAME="$2"

set -e

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

# 确保s.yaml存在
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
        DB_HOST: \${env.DB_HOST}
        DB_PORT: \${env.DB_PORT}
        DB_NAME: \${env.DB_NAME}
        DB_USER: \${env.DB_USER}
        DB_PASSWORD: \${env.DB_PASSWORD}
      triggers:
        - triggerName: http
          triggerType: http
          triggerConfig:
            authType: anonymous
            methods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
EOF
fi

# 部署
s deploy

# 输出函数URL
ACCOUNT_ID=$(aliyun sts GetCallerIdentity 2>/dev/null | grep -o '"AccountId":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ACCOUNT_ID" ]; then
    echo ""
    echo "🔗 API 访问地址:"
    echo "https://$ACCOUNT_ID.cn-hangzhou.fcapp.run/$PROJECT_NAME"
fi

echo "✅ API部署完成: $PROJECT_NAME"
