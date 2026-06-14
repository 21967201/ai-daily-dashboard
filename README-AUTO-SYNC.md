# AI日报晨报 - 自动同步配置指南

本指南将帮助你配置GitHub Actions + Cloudflare Pages的自动同步方案。

## 📋 系统架构

```
AI HOT API → GitHub Actions (每天08:00) → 生成HTML → 推送到GitHub → Cloudflare Pages自动部署
```

## 🚀 快速开始

### 第一步：创建GitHub仓库

1. 登录GitHub，点击右上角 "+" → "New repository"
2. 仓库名称：`ai-daily-dashboard`（可自定义）
3. 选择 "Public"（Cloudflare Pages需要访问public仓库，或配置private仓库的访问权限）
4. 勾选 "Add a README file"
5. 点击 "Create repository"

### 第二步：上传代码到GitHub

在你的本地项目目录运行：

```bash
# 初始化git仓库
git init

# 添加所有文件
git add .

# 首次提交
git commit -m "🎉 初始化AI日报晨报项目"

# 添加远程仓库（替换成你的仓库地址）
git remote add origin https://github.com/你的用户名/ai-daily-dashboard.git

# 推送到GitHub
git push -u origin main
```

### 第三步：启用GitHub Actions

1. 进入你的GitHub仓库
2. 点击顶部 "Actions" 标签
3. 如果看到 "Workflows all disabled" 提示，点击 "Enable workflows"
4. 确认 `.github/workflows/daily-update.yml` 已被识别

### 第四步：配置Cloudflare Pages

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 "Pages" → "Create a project" → "Connect to Git"
3. 选择你的GitHub仓库 `ai-daily-dashboard`
4. 配置构建设置：
   - **Framework preset**: `None`
   - **Build command**: 留空（不需要构建）
   - **Build output directory**: `/`（根目录）
5. 点击 "Save and Deploy"

### 第五步：测试自动更新

1. 在GitHub仓库的 "Actions" 标签中
2. 点击 "Daily AI Report Update" workflow
3. 点击 "Run workflow" → "Run workflow" 手动触发
4. 等待2-3分钟，检查是否成功
5. 访问Cloudflare Pages提供的域名，查看更新后的页面

## 🔧 配置文件说明

### 1. GitHub Actions Workflow (`.github/workflows/daily-update.yml`)

**关键配置：**

```yaml
schedule:
  - cron: '0 0 * * *'  # 北京时间每天08:00 (UTC 00:00)
```

**如需修改更新时间：**
- 北京时间 06:00 → `0 22 * * *`（前一天UTC 22:00）
- 北京时间 12:00 → `0 4 * * *`（UTC 04:00）
- 北京时间 20:00 → `0 12 * * *`（UTC 12:00）

### 2. HTML生成脚本 (`scripts/generate-html.js`)

**主要功能：**
- 调用AI HOT API获取最新日报
- 将数据注入HTML模板
- 生成完整的单文件HTML

**本地测试：**

```bash
# 安装依赖
npm install axios

# 运行脚本
node scripts/generate-html.js

# 检查生成的文件
open ai-daily-dashboard.html  # macOS
start ai-daily-dashboard.html   # Windows
```

## 📝 自定义配置

### 修改页面标题和样式

编辑 `scripts/generate-html.js` 中的 `HTML_TEMPLATE` 函数，修改：
- 页面标题
- CSS样式（颜色、字体、布局等）
- 卡片显示逻辑

### 添加回退逻辑（当天日报未生成时）

在 `scripts/generate-html.js` 的 `main()` 函数中添加：

```javascript
// 如果当天日报不存在，获取最近一期
if (error.response && error.response.status === 404) {
  console.log('⚠️ 今天日报尚未生成，回退到最近一期...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const fallbackResponse = await axios.get(
    `https://aihot.virxact.com/api/public/daily/${yesterdayStr}`,
    { headers: { 'User-Agent': USER_AGENT } }
  );
  data = fallbackResponse.data;
}
```

### 添加邮件通知

在 `.github/workflows/daily-update.yml` 中添加：

```yaml
      - name: Send email notification (optional)
        if: failure()
        uses: dawiddowski/action-send-mail@v3
        with:
          server_address: smtp.gmail.com
          server_port: 587
          username: ${{ secrets.MAIL_USERNAME }}
          password: ${{ secrets.MAIL_PASSWORD }}
          subject: AI日报更新失败
          body: AI日报晨报自动更新失败，请检查GitHub Actions日志。
          to: your-email@example.com
        env:
          MAIL_USERNAME: ${{ secrets.MAIL_USERNAME }}
          MAIL_PASSWORD: ${{ secrets.MAIL_PASSWORD }}
```

然后在GitHub仓库 Settings → Secrets and variables → Actions 中添加 `MAIL_USERNAME` 和 `MAIL_PASSWORD`。

## 🐛 故障排查

### GitHub Actions运行失败

1. 检查 "Actions" 标签中的运行日志
2. 常见错误：
   - **403 Forbidden**: User-Agent配置错误，确认已设置正确的UA
   - **Git push失败**: 确认GITHUB_TOKEN权限，需要在workflow中配置 `permissions: contents: write`
   - **npm install失败**: 确认Node.js版本配置正确

### Cloudflare Pages部署失败

1. 检查Cloudflare Pages的部署日志
2. 确认构建配置正确：
   - Build command: 留空
   - Output directory: `/`
3. 如果需要自定义域名，在Cloudflare Pages设置中配置

### HTML显示异常

1. 本地运行 `node scripts/generate-html.js` 测试
2. 检查生成的HTML文件是否完整
3. 在浏览器开发者工具中查看Console错误信息

## 📊 监控和维护

### 查看更新历史

- **GitHub**: 进入仓库 → "Actions" 标签查看所有运行记录
- **Cloudflare**: 进入Pages项目 → "Deployments" 查看部署历史

### 手动触发更新

在GitHub仓库 → "Actions" → 选择 "Daily AI Report Update" → "Run workflow"

### 暂停自动更新

在GitHub仓库 → "Actions" → 选择 "Daily AI Report Update" → "..." → "Disable workflow"

## 🔐 安全建议

1. **不要将API密钥提交到公开仓库**
   - 当前方案不需要API密钥（AI HOT免费公开访问）
   - 如果未来需要添加其他需要认证的API，使用GitHub Secrets存储

2. **定期审查GitHub Actions日志**
   - 确认没有异常访问
   - 检查API调用是否成功

3. **Cloudflare Pages访问控制**
   - 如需限制访问，可配置Cloudflare Access
   - 或设置基本的HTTP认证

## 📚 进阶功能

### 添加PWA支持（离线访问）

在HTML的 `<head>` 中添加：

```html
<link rel="manifest" href="manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

### 添加搜索功能

在HTML中添加搜索框和JavaScript过滤逻辑：

```html
<input type="text" id="searchInput" placeholder="搜索资讯...">
<script>
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const keyword = e.target.value.toLowerCase();
    document.querySelectorAll('.card').forEach(card => {
      const title = card.querySelector('.card-title').textContent.toLowerCase();
      card.style.display = title.includes(keyword) ? 'block' : 'none';
    });
  });
</script>
```

### 多语言支持

修改 `scripts/generate-html.js`，根据浏览器语言偏好显示中文/英文版本。

## 💡 常见问题

**Q: 为什么不用GitHub Pages？**
A: Cloudflare Pages提供更快的全球CDN加速，且构建失败不会影响主分支。

**Q: 可以部署到其他平台吗？**
A: 可以。Vercel、Netlify等平台都支持类似的自动部署功能。只需将构建命令设置为空，输出目录设置为根目录。

**Q: 如何节省GitHub Actions配额？**
A: 
- 免费账户每月有2000分钟额度，本workflow每次运行约2-3分钟
- 如果配额紧张，可以降低运行频率（改为每周或手动触发）

**Q: AI HOT API有限流吗？**
A: 有，600 requests/minute/IP。本方案每天只调用1次，远未达上限。

## 📞 支持

如果遇到问题，可以：
1. 查看 [GitHub Actions文档](https://docs.github.com/en/actions)
2. 查看 [Cloudflare Pages文档](https://developers.cloudflare.com/pages/)
3. 在GitHub仓库中提交Issue

---

**祝你使用愉快！ 🎉**
