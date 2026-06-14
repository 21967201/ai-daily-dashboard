const axios = require('axios');
const fs = require('fs');
const path = require('path');

const AIHOT_API = 'https://aihot.virxact.com/api/public/daily';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36';

// ========== 翻译函数 ==========
// 使用免费的MyMemory API进行中英互译
async function translateText(text, targetLang = 'zh-CN') {
  if (!text || text.trim() === '') return text;
  // 如果已经包含中文，就不翻译
  if (/[\u4e00-\u9fa5]/.test(text)) return text;
  
  try {
    const res = await axios.get('https://api.mymemory.translated.net/get', {
      params: {
        q: text.substring(0, 500), // API限制长度
        langpair: `en|${targetLang}`
      },
      timeout: 8000
    });
    
    const data = res.data;
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      let translated = data.responseData.translatedText;
      // 如果翻译结果和原文一样（说明没翻译成功），返回原文
      if (translated.toLowerCase() === text.toLowerCase()) return text;
      return translated;
    }
  } catch (e) {
    console.log(`   ⚠️ 翻译失败: ${e.message.substring(0, 80)}`);
  }
  return text;
}

// 批量翻译（带并发控制）
async function translateBatch(texts, maxConcurrency = 5) {
  const results = [];
  for (let i = 0; i < texts.length; i += maxConcurrency) {
    const batch = texts.slice(i, i + maxConcurrency);
    const translated = await Promise.all(batch.map(t => translateText(t)));
    results.push(...translated);
    if (i + maxConcurrency < texts.length) {
      // 避免请求过快
      await new Promise(r => setTimeout(r, 300));
    }
  }
  return results;
}

// ========== 获取 AI HOT 日报 ==========
async function fetchAIHot() {
  try {
    const res = await axios.get(AIHOT_API, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: 15000
    });
    if (res.data && res.data.sections) {
      console.log(`✅ AI HOT: ${res.data.date}，共 ${res.data.sections.reduce((s, sec) => s + sec.items.length, 0)} 条`);
      return res.data;
    }
  } catch (e) {
    console.log(`⚠️ AI HOT 获取失败: ${e.message}`);
  }
  return null;
}

// ========== 获取 GitHub Trending (AI 相关) ==========
async function fetchGitHubTrending() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const sinceStr = since.toISOString().split('T')[0];
    const res = await axios.get('https://api.github.com/search/repositories', {
      params: {
        q: 'ai OR llm OR agent OR "large language model" pushed:>' + sinceStr,
        sort: 'stars',
        order: 'desc',
        per_page: 10
      },
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/vnd.github.v3+json' },
      timeout: 15000
    });
    if (res.data && res.data.items) {
      const items = res.data.items.map(repo => ({
        title: repo.name,
        sourceName: 'GitHub热门',
        sourceUrl: repo.html_url,
        summary: (repo.description || '').substring(0, 80),
        sectionLabel: '开源项目'
      }));
      console.log(`✅ GitHub Trending: ${items.length} 个热门项目`);
      return items;
    }
  } catch (e) {
    console.log(`⚠️ GitHub Trending 获取失败: ${e.message}`);
  }
  return [];
}

// ========== 获取 ArXiv 最新 AI 论文 ==========
async function fetchArxiv() {
  try {
    const res = await axios.get('http://export.arxiv.org/api/query', {
      params: {
        search_query: 'cat:cs.AI OR cat:cs.LG OR cat:cs.CL',
        sortBy: 'submittedDate',
        sortOrder: 'descending',
        max_results: 10
      },
      timeout: 15000
    });
    const items = [];
    const entries = res.data.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    for (const entry of entries.slice(0, 8)) {
      const title = (entry.match(/<title>(.*?)<\/title>/s) || [])[1] || '';
      const link = (entry.match(/<id>(.*?)<\/id>/) || [])[1] || '';
      const summary = (entry.match(/<summary>(.*?)<\/summary>/s) || [])[1] || '';
      if (title && link) {
        items.push({
          title: title.replace(/\n/g, ' ').trim().substring(0, 100),
          sourceName: '学术论文',
          sourceUrl: link.trim(),
          summary: summary.replace(/\n/g, ' ').trim().substring(0, 100),
          sectionLabel: '前沿研究'
        });
      }
    }
    console.log(`✅ ArXiv: ${items.length} 篇最新论文`);
    return items;
  } catch (e) {
    console.log(`⚠️ ArXiv 获取失败: ${e.message}`);
  }
  return [];
}

// ========== AI 工具导航数据（全部中文）==========
const AI_TOOLS = [
  { name: 'ChatGPT', url: 'https://chat.openai.com', desc: 'OpenAI旗舰对话助手', icon: '💬' },
  { name: 'Claude', url: 'https://claude.ai', desc: 'Anthropic深度对话AI', icon: '🧠' },
  { name: 'Gemini', url: 'https://gemini.google.com', desc: 'Google多模态大模型', icon: '🔮' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com', desc: '深度求索国产大模型', icon: '🔍' },
  { name: '通义千问', url: 'https://chat.qwen.ai', desc: '阿里云通义千问', icon: '☁️' },
  { name: '豆包', url: 'https://www.doubao.com', desc: '字节跳动豆包助手', icon: '🫘' },
  { name: 'Coze扣子', url: 'https://www.coze.com', desc: '字节AI智能体平台', icon: '🤖' },
  { name: 'Dify', url: 'https://dify.ai', desc: '开源LLM应用开发平台', icon: '🛠️' },
  { name: 'HuggingFace', url: 'https://huggingface.co', desc: '全球最大AI模型社区', icon: '🤗' },
  { name: 'AI HOT日报', url: 'https://aihot.virxact.com', desc: 'AI行业资讯聚合', icon: '📰' },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/topics/artificial-intelligence', desc: 'AI新品发现平台', icon: '🚀' },
  { name: 'Papers with Code', url: 'https://paperswithcode.com', desc: '论文与代码对照平台', icon: '📝' },
];

// ========== 生成 HTML ==========
function generateHTML(allData) {
  const date = allData.date || new Date().toISOString().split('T')[0];
  const sections = allData.sections || [];
  const extraItems = allData.extraItems || [];

  const sectionMap = {};
  for (const sec of sections) {
    sectionMap[sec.label] = sec;
  }
  for (const item of extraItems) {
    if (!sectionMap[item.sectionLabel]) {
      sectionMap[item.sectionLabel] = { label: item.sectionLabel, items: [] };
      sections.push(sectionMap[item.sectionLabel]);
    }
    sectionMap[item.sectionLabel].items.push({
      title: item.title,
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl,
      summary: item.summary
    });
  }

  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  const counts = {};
  sections.forEach(s => { counts[s.label] = s.items.length; });

  let globalIndex = 1;
  const sectionIcons = {
    '模型发布/更新': '🤖',
    '产品发布/更新': '📱',
    '行业动态': '📰',
    '论文研究': '📚',
    '技巧与观点': '💡',
    '开源项目': '⭐',
    '模型更新': '🧠',
    '前沿研究': '🔬'
  };

  const navLinks = sections.map((sec, idx) =>
    `<a href="#section-${idx + 1}" class="nav-link">${sectionIcons[sec.label] || '📌'} ${sec.label} (${sec.items.length})</a>`
  ).join('');

  const cardsHTML = sections.map((section, idx) => {
    const icon = sectionIcons[section.label] || '📌';
    const itemsHTML = section.items.map(item => {
      const summary = item.summary ?
        (item.summary.length > 70 ? item.summary.substring(0, 70) + '...' : item.summary) :
        '';
      const idxHtml = `<div class="global-index">${globalIndex}</div>`;
      globalIndex++;
      return `
        <div class="card" style="animation-delay: ${(globalIndex - 2) * 0.05}s">
          <div class="card-header">
            ${idxHtml}
            <div class="source-chip">${item.sourceName || 'AI HOT'}</div>
          </div>
          <div class="card-title">${item.title}</div>
          <div class="card-summary">${summary}</div>
          <div class="card-footer">
            <div class="card-time">今天</div>
            <a href="${item.sourceUrl || '#'}" target="_blank" rel="noopener noreferrer" class="btn-original">阅读原文</a>
          </div>
        </div>`;
    }).join('');

    return `
      <div class="section" id="section-${idx + 1}">
        <h2 class="section-title">
          <span class="icon">${icon}</span>
          ${section.label}
          <span class="section-count">${section.items.length} 条</span>
        </h2>
        <div class="cards-grid">${itemsHTML}</div>
      </div>`;
  }).join('');

  const toolsHTML = AI_TOOLS.map(t =>
    `<a href="${t.url}" target="_blank" rel="noopener noreferrer" class="tool-card">
      <span class="tool-icon">${t.icon}</span>
      <span class="tool-name">${t.name}</span>
      <span class="tool-desc">${t.desc}</span>
    </a>`
  ).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI日报晨报 · ${date}</title>
    <style>
        :root {
            --primary: #FF6B35;
            --primary-dark: #E55A2B;
            --primary-light: #FFF5F0;
            --accent: #6366F1;
            --accent-light: #EEF2FF;
            --text-primary: #1E293B;
            --text-secondary: #64748B;
            --bg-main: #FFFBF7;
            --bg-card: #FFFFFF;
            --bg-sidebar: #F8FAFC;
            --border-radius: 12px;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
            --shadow-md: 0 4px 15px rgba(255,107,53,0.12);
            --shadow-lg: 0 8px 30px rgba(255,107,53,0.2);
            --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        * { margin:0; padding:0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            background: var(--bg-main);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .hero {
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 40%, #FF8C42 100%);
            color: white;
            padding: 50px 20px 35px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .hero::before {
            content: '';
            position: absolute;
            top: -60%; left: -60%;
            width: 220%; height: 220%;
            background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 60%);
            animation: pulse 5s ease-in-out infinite;
        }
        @keyframes pulse { 0%,100% { transform: scale(1); opacity:0.6; } 50% { transform: scale(1.08); opacity:1; } }
        .hero-inner { position: relative; z-index:1; max-width: 1200px; margin:0 auto; }
        .hero h1 { font-size: 2.2em; margin-bottom: 6px; text-shadow: 2px 2px 8px rgba(0,0,0,0.2); }
        .hero .date { font-size: 1.1em; opacity:0.95; margin-bottom: 24px; }

        .stats { display:flex; justify-content:center; gap:20px; flex-wrap:wrap; }
        .stat-item {
            background: rgba(255,255,255,0.18);
            backdrop-filter: blur(10px);
            padding: 12px 22px;
            border-radius: var(--border-radius);
            min-width: 100px;
            text-align: center;
        }
        .stat-number { font-size: 1.8em; font-weight: 800; display:block; line-height:1.2; }
        .stat-label { font-size: 0.82em; opacity:0.88; }

        .search-bar {
            max-width: 600px;
            margin: 20px auto 0;
            position: relative;
            z-index: 1;
        }
        .search-bar input {
            width: 100%;
            padding: 12px 20px 12px 44px;
            border: none;
            border-radius: 30px;
            font-size: 0.95em;
            background: rgba(255,255,255,0.95);
            color: var(--text-primary);
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            outline: none;
        }
        .search-bar input::placeholder { color: #94A3B8; }
        .search-bar::before {
            content: '🔍';
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 1.1em;
        }

        .nav {
            background: white;
            padding: 12px 15px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow-sm);
        }
        .nav-inner {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .nav-link {
            padding: 7px 16px;
            background: linear-gradient(135deg, var(--primary) 0%, #F7931E 100%);
            color: white;
            text-decoration: none;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 500;
            transition: var(--transition);
            white-space: nowrap;
        }
        .nav-link:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

        .main-layout {
            display: grid;
            grid-template-columns: 1fr 300px;
            gap: 30px;
            max-width: 1200px;
            margin: 0 auto;
            padding: 30px 20px;
        }
        @media (max-width: 900px) {
            .main-layout { grid-template-columns: 1fr; }
        }

        .content { min-width: 0; }

        .section { margin-bottom: 40px; }
        .section-title {
            font-size: 1.5em;
            color: var(--primary);
            margin-bottom: 18px;
            padding-bottom: 10px;
            border-bottom: 2.5px solid var(--primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-count {
            font-size: 0.6em;
            background: var(--primary-light);
            color: var(--primary);
            padding: 2px 10px;
            border-radius: 12px;
            font-weight: 600;
        }

        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }

        .card {
            background: var(--bg-card);
            border-radius: var(--border-radius);
            padding: 22px;
            box-shadow: var(--shadow-sm);
            transition: var(--transition);
            opacity: 0;
            transform: translateY(16px);
            animation: fadeInUp 0.5s ease forwards;
            border: 1px solid rgba(255,107,53,0.08);
        }
        .card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: rgba(255,107,53,0.2); }
        @keyframes fadeInUp { to { opacity:1; transform: translateY(0); } }

        .card-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px; }
        .global-index {
            background: linear-gradient(135deg, var(--primary) 0%, #F7931E 100%);
            color: white;
            width: 30px; height: 30px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 0.85em; flex-shrink: 0;
        }
        .source-chip {
            background: var(--primary-light);
            color: var(--primary);
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 500;
            border: 1px solid rgba(255,107,53,0.15);
        }
        .card-title { font-size: 1.05em; font-weight: 600; margin-bottom: 10px; line-height: 1.5; color: var(--text-primary); }
        .card-summary { color: var(--text-secondary); font-size: 0.9em; line-height: 1.6; margin-bottom: 14px; }
        .card-footer { display:flex; justify-content:space-between; align-items:center; }
        .card-time { font-size: 0.82em; color: var(--text-secondary); }
        .btn-original {
            background: linear-gradient(135deg, var(--primary) 0%, #F7931E 100%);
            color: white;
            padding: 6px 14px;
            border-radius: 18px;
            text-decoration: none;
            font-size: 0.82em;
            font-weight: 500;
            transition: var(--transition);
        }
        .btn-original:hover { box-shadow: 0 3px 10px rgba(255,107,53,0.4); transform: scale(1.04); }

        .sidebar { min-width: 0; }
        .sidebar-box {
            background: white;
            border-radius: var(--border-radius);
            padding: 22px;
            margin-bottom: 22px;
            box-shadow: var(--shadow-sm);
            border: 1px solid rgba(0,0,0,0.04);
        }
        .sidebar-title {
            font-size: 1.1em;
            font-weight: 700;
            color: var(--accent);
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .tool-card {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px 12px;
            margin-bottom: 8px;
            border-radius: 10px;
            text-decoration: none;
            color: var(--text-primary);
            transition: var(--transition);
            border: 1px solid transparent;
        }
        .tool-card:hover { background: var(--accent-light); border-color: rgba(99,102,241,0.2); }
        .tool-icon { font-size: 1.3em; flex-shrink: 0; width: 28px; text-align: center; }
        .tool-name { font-weight: 600; font-size: 0.9em; flex-shrink: 0; }
        .tool-desc { font-size: 0.78em; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .kw-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
        .kw-tag {
            padding: 5px 14px;
            border-radius: 16px;
            font-size: 0.82em;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
        }
        .kw-tag:hover { transform: scale(1.08); }
        .kw-1 { background: #FEE2E2; color: #DC2626; }
        .kw-2 { background: #FEF3C7; color: #D97706; }
        .kw-3 { background: #DBEAFE; color: #2563EB; }
        .kw-4 { background: #D1FAE5; color: #059669; }
        .kw-5 { background: #EDE9FE; color: #7C3AED; }

        .footer {
            background: #1E293B;
            color: white;
            text-align: center;
            padding: 30px 20px;
            margin-top: 50px;
        }
        .footer-info { font-size: 0.88em; opacity:0.8; }

        .dark-mode-toggle {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 200;
            background: white;
            border: none;
            border-radius: 50%;
            width: 44px; height: 44px;
            font-size: 1.3em;
            cursor: pointer;
            box-shadow: var(--shadow-md);
            transition: var(--transition);
        }
        .dark-mode-toggle:hover { transform: scale(1.1); }

        body.dark {
            --bg-main: #0F172A;
            --bg-card: #1E293B;
            --bg-sidebar: #1E293B;
            --text-primary: #F1F5F9;
            --text-secondary: #94A3B8;
            --primary-light: #312E2B;
            --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
        }
        body.dark .nav { background: #1E293B; }
        body.dark .tool-card:hover { background: #312E81; }
        body.dark .dark-mode-toggle { background: #334155; }

        @media (max-width: 768px) {
            .hero h1 { font-size: 1.6em; }
            .stats { gap: 12px; }
            .stat-item { min-width: 80px; padding: 10px 16px; }
            .cards-grid { grid-template-columns: 1fr; }
            .main-layout { padding: 20px 12px; }
            .sidebar { order: -1; }
        }

        .card.hidden { display: none !important; }
        .highlight { background: #FEF08A; color: #854D0E; padding: 1px 3px; border-radius: 3px; }
        body.dark .highlight { background: #F59E0B; color: #1E293B; }
    </style>
</head>
<body>
    <button class="dark-mode-toggle" onclick="toggleDarkMode()" title="切换暗黑模式">🌙</button>

    <div class="hero">
        <div class="hero-inner">
            <h1>📰 AI 日报晨报</h1>
            <div class="date">${date.replace(/-/g, '年').replace(/-/, '月')}日</div>
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-number">${totalCount}</span>
                    <span class="stat-label">总条数</span>
                </div>
                ${Object.entries(counts).map(([label, count]) =>
                    `<div class="stat-item">
                        <span class="stat-number">${count}</span>
                        <span class="stat-label">${label}</span>
                    </div>`
                ).join('')}
            </div>
            <div class="search-bar">
                <input type="text" id="searchInput" placeholder="搜索资讯标题、来源、摘要..." oninput="filterCards()">
            </div>
        </div>
    </div>

    <nav class="nav">
        <div class="nav-inner">
            ${navLinks}
            <a href="#sidebar-tools" class="nav-link" style="background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%);">🛠️ AI 工具箱</a>
        </div>
    </nav>

    <div class="main-layout">
        <div class="content" id="content">
            ${cardsHTML}
        </div>

        <div class="sidebar" id="sidebar-tools">
            <div class="sidebar-box">
                <div class="sidebar-title">🛠️ 常用AI工具</div>
                ${toolsHTML}
            </div>

            <div class="sidebar-box">
                <div class="sidebar-title">🔥 今日热词</div>
                <div class="kw-cloud" id="kwCloud"></div>
            </div>

            <div class="sidebar-box">
                <div class="sidebar-title">💡 使用说明</div>
                <ul style="font-size:0.85em; color:var(--text-secondary); line-height:2; padding-left:18px;">
                    <li>搜索框支持标题/来源/摘要关键词过滤</li>
                    <li>点击右上角🌙切换暗黑模式</li>
                    <li>数据来源：AI HOT / GitHub / 学术论文</li>
                    <li>每2小时自动更新最新资讯</li>
                </ul>
            </div>
        </div>
    </div>

    <footer class="footer">
        <div class="footer-info">
            共 <span id="footerTotal">${totalCount}</span> 条资讯
            | 数据来源：AI HOT / GitHub 热门 / 学术论文
            | 每2小时自动更新
        </div>
    </footer>

    <script>
        function toggleDarkMode() {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('darkMode', isDark);
            document.querySelector('.dark-mode-toggle').textContent = isDark ? '☀️' : '🌙';
        }
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark');
            document.querySelector('.dark-mode-toggle').textContent = '☀️';
        }

        function filterCards() {
            const keyword = document.getElementById('searchInput').value.toLowerCase().trim();
            const cards = document.querySelectorAll('.card');
            let visible = 0;
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (!keyword || text.includes(keyword)) {
                    card.classList.remove('hidden');
                    visible++;
                } else {
                    card.classList.add('hidden');
                }
            });
            document.getElementById('footerTotal').textContent = visible;
        }

        (function() {
            const cards = document.querySelectorAll('.card-title');
            const kwCount = {};
            const stopWords = ['的','了','是','在','和','与','或','对','为','这','那','一个','如何','怎么','为什么','什么','哪些','with','for','the','and','of','to','in','a','is','that','it','on'];
            cards.forEach(c => {
                const text = c.textContent;
                const words = text.split(/[\s,，。、；;！!？?：:""''（）()【】\-\–\—·]+/);
                words.forEach(w => {
                    if (w.length >= 2 && !stopWords.includes(w.toLowerCase())) {
                        kwCount[w] = (kwCount[w] || 0) + 1;
                    }
                });
            });
            const sorted = Object.entries(kwCount)
                .sort((a,b) => b[1] - a[1])
                .slice(0, 20);
            const cloud = document.getElementById('kwCloud');
            if (cloud && sorted.length > 0) {
                const maxCount = sorted[0][1];
                cloud.innerHTML = sorted.map(([w, c], i) => {
                    const cls = 'kw-' + (Math.min(Math.ceil(c / Math.max(maxCount,1) * 5), 5));
                    return '<span class="kw-tag ' + cls + '">' + w + '</span>';
                }).join('');
            } else if (cloud) {
                cloud.innerHTML = '<span style="color:var(--text-secondary);font-size:0.85em;">正在加载热词...</span>';
            }
        })();
    </script>
</body>
</html>`;
}

// ========== 主函数 ==========
async function main() {
  console.log('📡 开始获取多数据源...\n');

  const [aihotData, githubItems, arxivItems] = await Promise.allSettled([
    fetchAIHot(),
    fetchGitHubTrending(),
    fetchArxiv()
  ]);

  const result = {
    date: new Date().toISOString().split('T')[0],
    sections: [],
    extraItems: []
  };

  if (aihotData.status === 'fulfilled' && aihotData.value) {
    result.date = aihotData.value.date || result.date;
    result.sections = aihotData.value.sections || [];
  }

  let allExtraItems = [];
  
  if (githubItems.status === 'fulfilled' && githubItems.value.length > 0) {
    allExtraItems.push(...githubItems.value);
  }
  if (arxivItems.status === 'fulfilled' && arxivItems.value.length > 0) {
    allExtraItems.push(...arxivItems.value);
  }

  // ========== 翻译所有外文内容 ==========
  if (allExtraItems.length > 0) {
    console.log('\n🔄 正在翻译外文内容...');
    
    // 收集所有需要翻译的文本
    const textsToTranslate = [];
    allExtraItems.forEach(item => {
      textsToTranslate.push(item.title);
      textsToTranslate.push(item.summary);
    });
    
    // 批量翻译
    const translatedTexts = await translateBatch(textsToTranslate);
    
    // 将翻译结果写回
    for (let i = 0; i < allExtraItems.length; i++) {
      allExtraItems[i].title = translatedTexts[i * 2] || allExtraItems[i].title;
      allExtraItems[i].summary = translatedTexts[i * 2 + 1] || allExtraItems[i].summary;
      console.log(`   ✅ [${allExtraItems[i].sourceName}] ${allExtraItems[i].title.substring(0, 40)}...`);
    }
  }

  result.extraItems = allExtraItems;

  const html = generateHTML(result);
  const outputPath = path.join(__dirname, '..', 'ai-daily-dashboard.html');
  fs.writeFileSync(outputPath, html, 'utf8');

  const total = result.sections.reduce((s, sec) => s + sec.items.length, 0) + result.extraItems.length;
  console.log(`\n✅ HTML 已生成: ${outputPath}`);
  console.log(`   总计: ${total} 条资讯 (含 AI HOT + GitHub + 论文，全部已翻译为中文)`);
}

main().catch(e => {
  console.error('❌ 错误:', e.message);
  process.exit(1);
});
