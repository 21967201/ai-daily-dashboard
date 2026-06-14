# 🎉 AI 日报晨报 - 一键部署指南

## ✅ 已准备的文件

我已经为你创建了完整的自动化方案，包含以下文件：

| 文件 | 用途 |
|------|------|
| `ai-daily-dashboard.html` | 完整的晨报仪表盘页面 |
| `.github/workflows/daily-update.yml` | GitHub Actions 自动更新配置 |
| `scripts/generate-html.js` | 获取 AI HOT 数据并生成 HTML 的脚本 |
| `deploy.bat` | Windows 一键部署脚本 |
| `README-AUTO-SYNC.md` | 详细配置指南 |
| `SETUP-GUIDE.md` | 快速上手指南 |

---

## 🚀 一键部署（3 步完成）

### 第 1 步：创建 GitHub 仓库（30秒）

1. 访问 [https://github.com/new](https://github.com/new)
2. 填写信息：
   - **Repository name**: `ai-daily-dashboard`
   - **Description**: `AI 日报晨报 - 自动同步 AI HOT 数据`
   - 选择 **Public**
   - ⚠️ **不要**勾选 "Initialize with README"
3. 点击 **"Create repository"**

✅ 完成后，你的仓库地址是：  
`https://github.com/21967201/ai-daily-dashboard`

---

### 第 2 步：推送代码（全自动）

运行以下命令（在 `F:\WorkBuddyX\2026-06-14-10-38-04` 目录）：

```bash
# 初始化 Git
git init

# 添加所有文件
git add .

# 提交
git commit -m "🎉 初始化 AI 日报晨报项目"

# 添加远程仓库
git remote add origin https://github.com/21967201/ai-daily-dashboard.git

# 推送（首次需要输入 GitHub 用户名和密码）
git push -u origin main
```

⚠️ **如果提示需要认证**：
- **用户名**: `21967201`
- **密码**: 使用 [GitHub Personal Access Token](https://github.com/settings/tokens)
  - 创建 Token 时勾选 `repo` 权限
  - 使用 Token 作为密码

---

### 第 3 步：启用 GitHub Pages（自动托管）

1. 访问你的仓库：https://github.com/21967201/ai-daily-dashboard
2. 点击 **"Settings"** → **"Pages"**
3. **Source** 选择 **"Deploy from a branch"**
4. **Branch** 选择 **"main"** 和 **"/ (root)"**
5. 点击 **"Save"**
6. 等待 2-3 分钟，访问你的仪表盘：
   ```
   https://21967201.github.io/ai-daily-dashboard/ai-daily-dashboard.html
   ```

✅ **完成！** 你的仪表盘现在已经上线，并且每天北京时间 08:00 自动更新！

---

## 🔄 自动更新原理

1. **每天北京时间 08:00**，GitHub Actions 自动运行
2. 执行 `scripts/generate-html.js` 脚本
3. 脚本调用 AI HOT API 获取最新日报数据
4. 生成新的 `ai-daily-dashboard.html` 文件
5. 自动提交并推送到仓库
6. GitHub Pages 自动部署更新后的页面

**完全自动化，无需手动操作！**

---

## 📝 自定义配置

### 修改更新时间

编辑 `.github/workflows/daily-update.yml`：

```yaml
schedule:
  # 北京时间每天 06:00
  - cron: '0 22 * * *'  # UTC 22:00（前一天）
  
  # 北京时间每天 12:00
  - cron: '0 4 * * *'   # UTC 04:00
  
  # 北京时间每天 20:00
  - cron: '0 12 * * *'  # UTC 12:00
```

### 手动触发更新

1. 进入你的 GitHub 仓库
2. 点击 **"Actions"** 标签
3. 选择 **"Daily AI Report Update"**
4. 点击 **"Run workflow"** → **"Run workflow"**

---

## 🛠️ 故障排查

### GitHub Actions 运行失败

1. 进入仓库 → **"Actions"** 标签
2. 点击最新的运行记录
3. 查看日志，找到错误信息

**常见错误**：

❌ **403 Forbidden**
- 原因：`scripts/generate-html.js` 中的 User-Agent 配置错误
- 解决：确认 `USER_AGENT` 变量正确

❌ **Git push failed**
- 原因：GitHub Token 权限不足
- 解决：重新创建 Token，确保勾选 `repo` 权限

### GitHub Pages 部署失败

1. 进入仓库 → **"Settings"** → **"Pages"**
2. 查看 **"Build and deployment"** 部分
3. 确认配置正确：
   - **Build source**: `Deploy from a branch`
   - **Branch**: `main` / `/ (root)`

---

## 📊 监控和维护

### 查看更新历史

- **GitHub Actions**: 仓库 → **"Actions"** 标签
- **GitHub Pages**: 仓库 → **"Settings"** → **"Pages"** → **"View deployment"**

### 暂停自动更新

1. 进入仓库 → **"Actions"**
2. 选择 **"Daily AI Report Update"**
3. 点击 **"..."** → **"Disable workflow"**

### 恢复自动更新

1. 进入仓库 → **"Actions"**
2. 选择 **"Daily AI Report Update"**
3. 点击 **"Enable workflow"**

---

## 🎁 进阶功能

### 添加自定义域名

1. 在 GitHub Pages 设置中，添加你的域名
2. 在域名 DNS 设置中添加 CNAME 记录：
   ```
   CNAME: yourdomain.com -> 21967201.github.io
   ```

### 添加 Google Analytics

在 `ai-daily-dashboard.html` 的 `<head>` 中添加：

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 添加 PWA 支持（离线访问）

在 `ai-daily-dashboard.html` 的 `<head>` 中添加：

```html
<link rel="manifest" href="manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
</script>
```

---

## 💡 常见问题

**Q: 为什么使用 GitHub Pages 而不是 Cloudflare Pages？**  
A: GitHub Pages 完全免费，与 GitHub Actions 无缝集成，配置更简单。

**Q: 每天运行一次，会消耗很多 GitHub Actions 配额吗？**  
A: 不会。每次运行约 2-3 分钟，免费账户每月有 2000 分钟配额，足够使用。

**Q: 可以部署到其他平台吗？**  
A: 可以。Vercel、Netlify 等平台都支持类似的自动部署功能。

**Q: AI HOT API 有限流吗？**  
A: 有，600 requests/minute/IP。本方案每天只调用 1 次，远未达上限。

---

## 📞 获取帮助

如果遇到问题，可以：
1. 查看 `README-AUTO-SYNC.md` 中的详细故障排查指南
2. 查看 [GitHub Actions 文档](https://docs.github.com/en/actions)
3. 查看 [GitHub Pages 文档](https://docs.github.com/en/pages)
4. 在 GitHub 仓库中提交 Issue

---

## ✨ 完成！

现在你拥有了：

✅ 一个每天自动更新的 AI 日报晨报页面  
✅ 完全自动化的 CI/CD 流水线  
✅ 免费托管（GitHub Pages）  
✅ 零服务器成本  

**祝你使用愉快！🎉**

---

## 📎 附录：文件清单

```
F:\WorkBuddyX\2026-06-14-10-38-04\
├── .github\
│   └── workflows\
│       └── daily-update.yml      # GitHub Actions 配置
├── scripts\
│   └── generate-html.js          # HTML 生成脚本
├── ai-daily-dashboard.html        # 完整的 HTML 仪表盘
├── README-AUTO-SYNC.md           # 详细配置指南
├── SETUP-GUIDE.md               # 快速上手指南
├── deploy.bat                    # Windows 部署脚本
└── DEPLOYMENT-GUIDE.md          # 本文件
```

---

**最后提醒**：
- 首次配置可能需要 30-60 分钟
- 确保所有文件都已推送到 GitHub
- 耐心等待 GitHub Actions 和 GitHub Pages 的首次运行
- 有问题随时查看日志！
