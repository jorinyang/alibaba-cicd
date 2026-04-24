# 项目类型说明

## 支持的类型

### 1. 静态网站 (static)

**特征**: 
- 有 `index.html` 文件
- 无 `package.json`

**部署方式**: 
- 直接上传到OSS

**示例**:
```
projects/my-site/
├── index.html
├── css/
└── js/
```

### 2. 单页应用 (node-spa)

**特征**:
- 有 `package.json`
- dependencies包含 react/vue/next 等

**部署方式**:
- 执行 `npm run build`
- 上传 `dist/` 或 `build/` 到OSS

**示例**:
```
projects/my-react-app/
├── package.json      # 包含 "react"
├── src/
└── public/
```

### 3. Node.js API (node-api)

**特征**:
- 有 `package.json`
- dependencies包含 express/koa/fastify 等

**部署方式**:
- 使用Serverless Devs部署到函数计算

**示例**:
```
projects/my-api/
├── package.json      # 包含 "express"
├── index.js          # 导出 handler 函数
└── src/
```

## 添加新类型

编辑 `scripts/detect-type.sh`，添加新的检测逻辑：

```bash
# 检测Python项目
if [ -f "requirements.txt" ]; then
  echo "python"
  exit 0
fi
```

然后创建对应的部署脚本 `scripts/deploy-python.sh`。
