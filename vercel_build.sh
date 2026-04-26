#!/bin/bash
# Vercel build script - used for CI/CD

cd "$(dirname "$0")/workshop-grouping"

# Install dependencies
npm install

# Build
npm run build

echo "Build complete. Files in dist/"
ls -la dist/ | head -10
