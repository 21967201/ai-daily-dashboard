const axios = require('axios');
const fs = require('fs');
const path = require('path');

// AI HOT API配置
const AIHOT_API = 'https://aihot.virxact.com/api/public/daily';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// HTML模板 - 这里嵌入完整的HTML结构
const HTML_TEMPLATE = (data) => {
  const date = data.date;
  const sections = data.sections;
  
  // 计算总数
  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);
  const counts = {};
  sections.forEach(s => {
    counts[s.label] = s.items.length;
  });

  // 版块图标映射（移到最外层，所有作用域都可访问）
  const sectionIcons = {
    '模型发布/更新': '🤖',
    '产品发布/更新': '📱',
    '行业动态': '📰',
    '论文研究': '📚',
    '技巧与观点': '💡'
  };
  
  // 生成卡片HTML
  let globalIndex = 1;
  const cardsHTML = sections.map((section, idx) => {
    const icon = sectionIcons[section.label] || '📌';
    
    const itemsHTML = section.items.map(item => {
      const summary = item.summary ? 
        (item.summary.length > 60 ? item.summary.substring(0, 60) + '...' : item.summary) : 
        '';
      
      return `
        <div class="card" style="animation-delay: ${(globalIndex - 1) * 0.1}s">
          <div class="card-header">
            <div class="global-index">${globalIndex}</div>
            <div class="source-chip">${item.sourceName}</div>
          </div>
          <div class="card-title">${item.title}</div>
          <div class="card-summary">${summary}</div>
          <div class="card-footer">
            <div class="card-time">今天</div>
            <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" class="btn-original">阅读原文</a>
          </div>
        </div>
      `;
    }).join('');
    
    globalIndex += section.items.length;
    
    return `
      <div class="section" id="section-${idx + 1}">
        <h2 class="section-title">
          <span class="icon">${icon}</span>
          ${section.label}
        </h2>
        <div class="cards-grid">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');
  
  // 导航链接
  const navLinks = sections.map((section, idx) => {
    const count = counts[section.label] || 0;
    return `<a href="#section-${idx + 1}" class="nav-link">${sectionIcons[section.label] || '📌'} ${section.label} (${count})</a>`;
  }).join('');
  
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI日报晨报 · ${date}</title>
    <style>
        :root {
            --primary-gradient: linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FFA07A 100%);
            --card-shadow: 0 4px 15px rgba(255, 107, 53, 0.15);
            --card-hover-shadow: 0 8px 30px rgba(255, 107, 53, 0.25);
            --text-primary: #2D3436;
            --text-secondary: #636E72;
            --bg-card: #FFFFFF;
            --border-radius: 12px;
            --transition: all 0.3s ease;
        }

        * {
            margin:0;
            padding:0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
            background: linear-gradient(180deg, #FFF5F0 0%, #FFFFFF 100%);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .hero {
            background: var(--primary-gradient);
            color: white;
            padding: 60px 20px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
            animation: pulse 4s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity:0.5; }
            50% { transform: scale(1.1); opacity:0.8; }
        }

        .hero-content {
            position: relative;
            z-index:1;
            max-width: 1200px;
            margin:0 auto;
        }

        .hero h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow:2px 2px 4px rgba(0,0,0,0.2);
        }

        .hero .date {
            font-size: 1.2em;
            opacity:0.95;
            margin-bottom: 30px;
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        .stat-item {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            padding: 15px 25px;
            border-radius: var(--border-radius);
            min-width: 120px;
        }

        .stat-number {
            font-size: 2em;
            font-weight: bold;
            display: block;
        }

        .stat-label {
            font-size: 0.9em;
            opacity:0.9;
        }

        .nav {
            background: white;
            padding: 15px;
            position: sticky;
            top:0;
            z-index:100;
            box-shadow:0 2px 10px rgba(0,0,0,0.05);
        }

        .nav-content {
            max-width: 1200px;
            margin:0 auto;
            display: flex;
            justify-content: center;
            gap:10px;
            flex-wrap: wrap;
        }

        .nav-link {
            padding:8px 16px;
            background: linear-gradient(135deg, #FF6B35 0%, #F7931E 100%);
            color: white;
            text-decoration: none;
            border-radius: 20px;
            font-size:0.9em;
            transition: var(--transition);
            white-space: nowrap;
        }

        .nav-link:hover {
            transform: translateY(-2px);
            box-shadow:0 4px 12px rgba(255, 107, 53, 0.4);
        }

        .container {
            max-width: 1200px;
            margin:0 auto;
            padding: 40px 20px;
        }

        .section {
            margin-bottom: 50px;
        }

        .section-title {
            font-size: 1.8em;
            color: #FF6B35;
            margin-bottom: 25px;
            padding-bottom:10px;
            border-bottom:3px solid #FF6B35;
            display: flex;
            align-items: center;
            gap:10px;
        }

        .section-title .icon {
            font-size:1.2em;
        }

        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap:25px;
        }

        .card {
            background: var(--bg-card);
            border-radius: var(--border-radius);
            padding:25px;
            box-shadow: var(--card-shadow);
            transition: var(--transition);
            opacity:0;
            transform: translateY(20px);
            animation: fadeInUp 0.6s ease forwards;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: var(--card-hover-shadow);
        }

        @keyframes fadeInUp {
            to {
                opacity:1;
                transform: translateY(0);
            }
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom:15px;
        }

        .global-index {
            background: var(--primary-gradient);
            color: white;
            width:32px;
            height:32px;
            border-radius:50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size:0.9em;
            flex-shrink:0;
        }

        .source-chip {
            background: #FFF5F0;
            color: #FF6B35;
            padding:4px 12px;
            border-radius:15px;
            font-size:0.85em;
            border:1px solid #FFE0D0;
        }

        .card-title {
            font-size:1.15em;
            font-weight:600;
            color: var(--text-primary);
            margin-bottom:12px;
            line-height:1.4;
        }

        .card-summary {
            color: var(--text-secondary);
            font-size:0.95em;
            line-height:1.6;
            margin-bottom:15px;
            display: -webkit-box;
            -webkit-line-clamp:3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }

        .card-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .card-time {
            font-size:0.85em;
            color: var(--text-secondary);
        }

        .btn-original {
            background: var(--primary-gradient);
            color: white;
            padding:8px 16px;
            border-radius:20px;
            text-decoration: none;
            font-size:0.9em;
            transition: var(--transition);
            border: none;
            cursor: pointer;
        }

        .btn-original:hover {
            transform: scale(1.05);
            box-shadow:0 4px 12px rgba(255, 107, 53, 0.4);
        }

        .footer {
            background: #2D3436;
            color: white;
            text-align: center;
            padding:30px 20px;
            margin-top:60px;
        }

        .footer-info {
            font-size:0.9em;
            opacity:0.8;
        }

        @media (max-width: 768px) {
            .hero h1 {
                font-size:1.8em;
            }
            
            .stats {
                gap:15px;
            }
            
            .stat-item {
                min-width:100px;
                padding:12px 20px;
            }
            
            .cards-grid {
                grid-template-columns:1fr;
            }
        }
    </style>
</head>
<body>
    <div class="hero">
        <div class="hero-content">
            <h1>🌅 AI日报晨报</h1>
            <div class="date">${date.replace(/-/g, '年').replace(/-/, '月')}日</div>
            <div class="stats">
                <div class="stat-item">
                    <span class="stat-number">${totalCount}</span>
                    <span class="stat-label">总条数</span>
                </div>
                ${Object.entries(counts).map(([label, count]) => `
                <div class="stat-item">
                    <span class="stat-number">${count}</span>
                    <span class="stat-label">${label}</span>
                </div>
                `).join('')}
            </div>
        </div>
    </div>

    <nav class="nav">
        <div class="nav-content">
            ${navLinks}
        </div>
    </nav>

    <div class="container" id="content">
        ${cardsHTML}
    </div>

    <footer class="footer">
        <div class="footer-info">
            共 <span id="footerTotal">${totalCount}</span> 条资讯 | 数据来源：AI HOT (aihot.virxact.com)
        </div>
    </footer>
</body>
</html>`;
};

// 主函数
async function main() {
  try {
    console.log('📡 正在获取AI HOT日报数据...');
    
    // 调用AI HOT API
    const response = await axios.get(AIHOT_API, {
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    
    const data = response.data;
    
    // 检查是否有数据
    if (!data.sections || data.sections.length === 0) {
      console.log('⚠️ 今天日报尚未生成，尝试获取昨天的日报...');
      // 这里可以添加回退逻辑
      return;
    }
    
    console.log(`✅ 成功获取数据：${data.date}，共${data.sections.reduce((sum, s) => sum + s.items.length, 0)}条资讯`);
    
    // 生成HTML
    const html = HTML_TEMPLATE(data);
    
    // 写入文件
    const outputPath = path.join(__dirname, '..', 'ai-daily-dashboard.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    
    console.log(`✅ HTML文件已生成：${outputPath}`);
    
  } catch (error) {
    console.error('❌ 错误：', error.message);
    process.exit(1);
  }
}

main();
