#!/bin/bash
# 项目类型检测脚本

PROJECT_DIR="$1"

if [ -z "$PROJECT_DIR" ]; then
  echo "用法: $0 <项目目录>"
  exit 1
fi

cd "$PROJECT_DIR" || exit 1

# 检测package.json
if [ -f "package.json" ]; then
  # 读取dependencies
  DEPS=$(cat package.json | node -e "
    const pkg = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const deps = {...(pkg.dependencies || {}), ...(pkg.devDependencies || {})};
    console.log(Object.keys(deps).join(' '));
  " 2>/dev/null)
  
  # 检测API框架
  if echo "$DEPS" | grep -qE "\b(express|koa|fastify|hapi|nest)\b"; then
    echo "node-api"
    exit 0
  fi
  
  # 检测前端框架
  if echo "$DEPS" | grep -qE "\b(react|vue|next|nuxt|angular|svelte)\b"; then
    echo "node-spa"
    exit 0
  fi
  
  # 有package.json但没有框架，视为Node.js项目
  echo "node-spa"
  exit 0
fi

# 检测Python项目
if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ] || [ -f "setup.py" ]; then
  echo "python"
  exit 0
fi

# 检测静态网站（有index.html）
if [ -f "index.html" ] || [ -f "src/index.html" ]; then
  echo "static"
  exit 0
fi

# 默认静态
if [ -f "*.html" ]; then
  echo "static"
  exit 0
fi

echo "unknown"
