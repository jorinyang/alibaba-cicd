#!/usr/bin/env python3
"""
上传文件/目录到阿里云OSS
用法: python upload_to_oss.py <local_path> <oss://bucket/prefix/> [endpoint]
示例: python upload_to_oss.py ./dist oss://bucket-name/prefix/ oss-cn-hongkong.aliyuncs.com
"""

import sys
import os

# 安装oss2
os.system("pip install oss2 -q")

import oss2

def upload_file(bucket, local_path, oss_key):
    """上传单个文件"""
    bucket.put_object_from_file(oss_key, local_path)
    print(f"  ✓ {local_path} -> oss://{bucket.bucket_name}/{oss_key}")

def upload_dir(bucket, local_dir, oss_prefix):
    """递归上传目录"""
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_dir)
            oss_key = os.path.join(oss_prefix, relative_path).replace("\\", "/")
            upload_file(bucket, local_path, oss_key)

def main():
    if len(sys.argv) < 3:
        print("用法: python upload_to_oss.py <local_path> <oss://bucket/prefix/> [endpoint]")
        sys.exit(1)
    
    local_path = sys.argv[1]
    oss_url = sys.argv[2]
    endpoint = sys.argv[3] if len(sys.argv) > 3 else os.environ.get("OSS_ENDPOINT", "oss-cn-hangzhou.aliyuncs.com")
    
    # 解析OSS URL
    # oss://bucket/prefix/
    if not oss_url.startswith("oss://"):
        print("错误: OSS URL必须以oss://开头")
        sys.exit(1)
    
    parts = oss_url[6:].split("/", 1)
    bucket_name = parts[0]
    prefix = parts[1] if len(parts) > 1 else ""
    
    # 从环境变量获取凭证
    access_key_id = os.environ.get("ALIYUN_ACCESS_KEY_ID")
    access_key_secret = os.environ.get("ALIYUN_ACCESS_KEY_SECRET")
    
    if not access_key_id or not access_key_secret:
        print("错误: 需要环境变量 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET")
        sys.exit(1)
    
    # 创建Bucket实例
    auth = oss2.Auth(access_key_id, access_key_secret)
    bucket = oss2.Bucket(auth, f"https://{endpoint}", bucket_name)
    
    print(f"📤 上传到 oss://{bucket_name}/{prefix} (endpoint: {endpoint})")
    
    if os.path.isfile(local_path):
        oss_key = os.path.join(prefix, os.path.basename(local_path)).replace("\\", "/")
        upload_file(bucket, local_path, oss_key)
    elif os.path.isdir(local_path):
        upload_dir(bucket, local_path, prefix)
    else:
        print(f"错误: 路径不存在: {local_path}")
        sys.exit(1)
    
    print("✅ 上传完成")

if __name__ == "__main__":
    main()
