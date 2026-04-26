# 阿里云OSS香港节点配置

> 创建时间: 2026-04-26
> 状态: ✅ 已创建

## Bucket信息

| 配置项 | 值 |
|--------|-----|
| Bucket名称 | `clawshell-backup-hk` |
| 地域 | cn-hongkong (香港) |
| Endpoint | `oss-cn-hongkong.aliyuncs.com` |
| Website URL | `https://clawshell-backup-hk.oss-cn-hongkong.aliyuncs.com` |
| ACL | private |
| CORS | ✅ 已配置 (允许跨域访问) |
| 静态网站托管 | ✅ 已配置 (index.html, 404.html) |

## 访问方式

### 1. 通过默认域名访问
```
https://clawshell-backup-hk.oss-cn-hongkong.aliyuncs.com
```

### 2. 通过自定义域名访问
将域名(CNAME)指向: `clawshell-backup-hk.oss-cn-hongkong.aliyuncs.com`
然后在阿里云OSS控制台绑定自定义域名即可。

**注意**: 香港节点无需ICP备案

## GitHub Secrets配置

需要在GitHub仓库的Settings → Secrets → Actions中添加:

```bash
# OSS香港节点
OSS_HK_BUCKET=clawshell-backup-hk
OSS_HK_ENDPOINT=oss-cn-hongkong.aliyuncs.com
```

## n8n部署工作流

香港OSS节点作为Vercel的备份，当Vercel不可用时自动切换。

### 部署逻辑
```
1. GitHub Push触发
2. n8n健康检查: GET https://api.vercel.com/v6/deployments
   ├── 可用(200) → 部署到Vercel
   └── 不可用 → 部署到阿里云OSS香港节点
3. 发送部署通知
```

## 部署命令

### 上传静态文件到香港OSS
```bash
~/.aliyun/ossutil cp -r ./dist oss://clawshell-backup-hk/ --endpoint oss-cn-hongkong.aliyuncs.com
```

### 设置静态网站索引
```python
import oss2
auth = oss2.Auth('<AK>', '<SK>')
bucket = oss2.Bucket(auth, 'oss-cn-hongkong.aliyuncs.com', 'clawshell-backup-hk')
bucket.put_bucket_website(oss2.models.BucketWebsite(index_file='index.html', error_file='404.html'))
```
