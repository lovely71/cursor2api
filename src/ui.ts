type HomePageOptions = {
    version: string;
    baseUrl: string;
    model: string;
};

function escapeHtml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

export function renderHomePage(options: HomePageOptions): string {
    const version = escapeHtml(options.version);
    const model = escapeHtml(options.model);
    const baseUrl = options.baseUrl.replace(/\/$/, '');
    const openAIBaseUrl = `${baseUrl}/v1`;

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light dark" />
  <title>Cursor2API v${version}</title>
  <style>
    :root {
      --bg: #f5f6f8;
      --text: #0b0d12;
      --muted: rgba(11, 13, 18, .58);
      --card: rgba(255, 255, 255, .72);
      --border: rgba(11, 13, 18, .10);
      --shadow: 0 18px 55px rgba(0, 0, 0, .12);
      --accent: #007aff;
      --radius: 22px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      --sans: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0b0d12;
        --text: #f2f4f8;
        --muted: rgba(242, 244, 248, .62);
        --card: rgba(28, 31, 38, .72);
        --border: rgba(242, 244, 248, .12);
        --shadow: 0 18px 55px rgba(0, 0, 0, .50);
        --accent: #0a84ff;
      }
    }

    * { box-sizing: border-box; }
    html, body { height: 100%; }
    body {
      margin: 0;
      font-family: var(--sans);
      color: var(--text);
      background:
        radial-gradient(1200px 520px at 20% -10%, rgba(0, 122, 255, .16), transparent 55%),
        radial-gradient(1000px 600px at 110% 10%, rgba(90, 200, 250, .12), transparent 60%),
        var(--bg);
    }

    .wrap {
      width: min(980px, 100%);
      margin: 0 auto;
      padding: calc(24px + env(safe-area-inset-top)) 18px calc(28px + env(safe-area-inset-bottom));
    }

    .header {
      padding: 18px 4px 10px;
    }

    .titleRow {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    h1 {
      margin: 0;
      font-size: 30px;
      font-weight: 740;
      letter-spacing: -0.02em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(0, 122, 255, .25);
      background: rgba(0, 122, 255, .10);
      color: var(--accent);
      font-weight: 650;
      font-size: 13px;
    }

    .subtitle {
      margin: 10px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.5;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      margin-top: 12px;
    }

    .card {
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--card);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      padding: 16px 16px 14px;
      overflow: hidden;
    }

    .card h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: .02em;
      text-transform: uppercase;
      color: var(--muted);
    }

    .kv {
      display: grid;
      gap: 10px;
      margin-top: 12px;
    }

    .kvRow {
      display: grid;
      grid-template-columns: 92px 1fr;
      gap: 10px;
      align-items: start;
    }

    .kvKey {
      font-size: 13px;
      color: var(--muted);
      padding-top: 2px;
    }

    code, pre {
      font-family: var(--mono);
      font-size: 12.5px;
    }

    .inlineCode {
      display: inline-flex;
      padding: 4px 8px;
      border-radius: 10px;
      background: rgba(127, 127, 127, .10);
      border: 1px solid rgba(127, 127, 127, .14);
      word-break: break-all;
    }

    .list {
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 10px;
    }

    .listItem {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 16px;
      border: 1px solid rgba(127, 127, 127, .14);
      background: rgba(127, 127, 127, .06);
    }

    .hint {
      font-size: 12px;
      color: var(--muted);
      white-space: nowrap;
    }

    .snippet {
      margin-top: 12px;
      border-radius: 18px;
      border: 1px solid rgba(127, 127, 127, .14);
      background: rgba(127, 127, 127, .06);
      overflow: hidden;
    }

    .snippetHead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(127, 127, 127, .12);
    }

    .snippetTitle {
      font-weight: 700;
      font-size: 13px;
    }

    .btn {
      appearance: none;
      border: 1px solid rgba(127, 127, 127, .24);
      background: rgba(255, 255, 255, .45);
      color: var(--text);
      border-radius: 999px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
      transition: transform .08s ease, background .12s ease;
    }

    @media (prefers-color-scheme: dark) {
      .btn { background: rgba(28, 31, 38, .65); }
    }

    .btn:active { transform: scale(.98); }

    pre {
      margin: 0;
      padding: 10px 12px 12px;
      overflow: auto;
      line-height: 1.5;
    }

    .footer {
      margin-top: 16px;
      padding: 10px 6px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      color: var(--muted);
      font-size: 12px;
    }

    .footer a {
      color: inherit;
      text-decoration: none;
      padding: 6px 10px;
      border-radius: 999px;
      border: 1px solid rgba(127, 127, 127, .14);
      background: rgba(127, 127, 127, .06);
    }

    .footer code {
      font-family: var(--mono);
      font-size: 12px;
    }

    @media (max-width: 420px) {
      h1 { font-size: 26px; }
      .kvRow { grid-template-columns: 78px 1fr; }
      .card { padding: 14px 14px 12px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="header">
      <div class="titleRow">
        <h1>Cursor2API</h1>
        <span class="badge">v${version}</span>
      </div>
      <p class="subtitle">Cursor Docs AI → Anthropic Messages / OpenAI Chat Completions / Cursor IDE Responses 兼容代理</p>
    </header>

    <section class="grid">
      <article class="card">
        <h2>状态</h2>
        <div class="kv">
          <div class="kvRow"><div class="kvKey">Server</div><div><code class="inlineCode">${escapeHtml(baseUrl)}</code></div></div>
          <div class="kvRow"><div class="kvKey">Model</div><div><code class="inlineCode">${model}</code></div></div>
          <div class="kvRow"><div class="kvKey">OpenAI Base</div><div><code class="inlineCode">${escapeHtml(openAIBaseUrl)}</code></div></div>
        </div>
      </article>

      <article class="card">
        <h2>端点</h2>
        <ul class="list">
          <li class="listItem"><code>POST /v1/messages</code><span class="hint">Anthropic</span></li>
          <li class="listItem"><code>POST /v1/chat/completions</code><span class="hint">OpenAI</span></li>
          <li class="listItem"><code>POST /v1/responses</code><span class="hint">Cursor IDE</span></li>
          <li class="listItem"><code>GET /v1/models</code><span class="hint">Models</span></li>
          <li class="listItem"><code>GET /health</code><span class="hint">Health</span></li>
        </ul>
      </article>

      <article class="card">
        <h2>快速配置</h2>

        <div class="snippet">
          <div class="snippetHead">
            <div class="snippetTitle">Claude Code</div>
            <button class="btn" type="button" data-copy="export ANTHROPIC_BASE_URL=${escapeHtml(baseUrl)}">复制</button>
          </div>
          <pre><code>export ANTHROPIC_BASE_URL=${escapeHtml(baseUrl)}</code></pre>
        </div>

        <div class="snippet" style="margin-top: 10px;">
          <div class="snippetHead">
            <div class="snippetTitle">Cursor IDE / OpenAI Compatible</div>
            <button class="btn" type="button" data-copy="OPENAI_BASE_URL=${escapeHtml(openAIBaseUrl)}">复制</button>
          </div>
          <pre><code>OPENAI_BASE_URL=${escapeHtml(openAIBaseUrl)}</code></pre>
        </div>
      </article>
    </section>

    <footer class="footer">
      <a href="/ui">信息</a>
      <a href="/logs">日志</a>
      <a href="/health">健康</a>
      <a href="/v1/models">模型</a>
      <span>提示：API 客户端访问 <code>/</code> 默认仍返回 JSON。</span>
    </footer>
  </main>

  <script>
    (function () {
      var buttons = document.querySelectorAll('[data-copy]');
      for (var i = 0; i < buttons.length; i++) {
        (function (btn) {
          var original = btn.textContent;
          btn.addEventListener('click', async function () {
            var text = btn.getAttribute('data-copy') || '';
            try {
              await navigator.clipboard.writeText(text);
              btn.textContent = '已复制';
              setTimeout(function () { btn.textContent = original; }, 1200);
            } catch (e) {
              btn.textContent = '复制失败';
              setTimeout(function () { btn.textContent = original; }, 1200);
            }
          });
        })(buttons[i]);
      }
    })();
  </script>
</body>
</html>`;
}
