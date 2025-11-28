#!/bin/bash

# 完整的用户提交功能测试

echo "🧪 测试用户提交功能"
echo "===================="
echo ""

BASE_URL="http://localhost:3000"

# 1. 测试提交
echo "1️⃣ 提交测试网站..."
SUBMIT_RESULT=$(curl -s -X POST "$BASE_URL/api/submissions/test" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://test-$(date +%s).com\",
    \"title\": \"测试网站 $(date +%H:%M:%S)\",
    \"description\": \"这是一个自动化测试提交\",
    \"categoryId\": 1
  }")

echo "$SUBMIT_RESULT" | jq '.' 2>/dev/null || echo "$SUBMIT_RESULT"
echo ""

# 2. 查看提交列表
echo "2️⃣ 查看提交列表..."
curl -s "$BASE_URL/api/submissions?status=verified" | jq '.submissions | length' | xargs -I {} echo "找到 {} 个已验证的提交"
echo ""

# 3. 触发发布
echo "3️⃣ 手动触发发布..."
PUBLISH_RESULT=$(curl -s "$BASE_URL/api/cron/publish")
echo "$PUBLISH_RESULT" | jq '.' 2>/dev/null || echo "$PUBLISH_RESULT"
echo ""

# 4. 检查书签数量
echo "4️⃣ 检查书签总数..."
echo "请访问 http://localhost:3000 查看新发布的书签"
echo ""

echo "✅ 测试完成！"
echo ""
echo "💡 提示："
echo "  - 访问管理员界面: $BASE_URL/admin/submissions"
echo "  - 查看主页: $BASE_URL"
echo "  - 查看提交页面: $BASE_URL/submit"


