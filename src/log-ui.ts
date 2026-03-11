import type { LogEntry } from './logs.js';

type LogPageOptions = {
    version: string;
    baseUrl: string;
    model: string;
    stats: { size: number; capacity: number; lastId: number };
    recent: LogEntry[];
};

function escapeHtml(input: string): string {
    return input
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function toTime(ts: number): string {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    const ms = String(d.getMilliseconds()).padStart(3, '0');
    return `${hh}:${mm}:${ss}.${ms}`;
}

function levelBadge(level: string): { text: string; cls: string } {
    switch (level) {
        case 'error':
            return { text: 'ERROR', cls: 'lvl lvlError' };
        case 'warn':
            return { text: 'WARN', cls: 'lvl lvlWarn' };
        case 'info':
            return { text: 'INFO', cls: 'lvl lvlInfo' };
        case 'debug':
            return { text: 'DEBUG', cls: 'lvl lvlDebug' };
        default:
            return { text: 'LOG', cls: 'lvl lvlLog' };
    }
}

export function renderLogsPage(options: LogPageOptions): string {
    const version = escapeHtml(options.version);
    const model = escapeHtml(options.model);
    const baseUrl = options.baseUrl.replace(/\/$/, '');
    const openAIBaseUrl = `${baseUrl}/v1`;

    const recentHtml = options.recent
        .map(entry => {
            const badge = levelBadge(entry.level);
            const time = toTime(entry.ts);
            const msg = escapeHtml(entry.message);
            return `<div class="row" data-id="${entry.id}" data-level="${escapeHtml(entry.level)}">
  <div class="meta">
    <span class="${badge.cls}">${badge.text}</span>
    <span class="time">${escapeHtml(time)}</span>
    <span class="id">#${entry.id}</span>
  </div>
  <pre class="msg">${msg}</pre>
</div>`;
        })
        .join('\n');

    const statsJson = JSON.stringify(options.stats);

    return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="light dark" />
  <title>Cursor2API Logs</title>
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

      --lvl-log: rgba(120, 120, 128, .18);
      --lvl-info: rgba(0, 122, 255, .18);
      --lvl-warn: rgba(255, 149, 0, .18);
      --lvl-error: rgba(255, 59, 48, .18);
      --lvl-debug: rgba(52, 199, 89, .18);
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
        --lvl-log: rgba(120, 120, 128, .20);
        --lvl-info: rgba(10, 132, 255, .20);
        --lvl-warn: rgba(255, 159, 10, .20);
        --lvl-error: rgba(255, 69, 58, .20);
        --lvl-debug: rgba(48, 209, 88, .20);
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
      width: min(1100px, 100%);
      margin: 0 auto;
      padding: calc(18px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));
    }

    .top {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      padding: 6px 2px 10px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 740;
      letter-spacing: -0.02em;
    }

    .sub {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.55;
      max-width: 62ch;
    }

    .pillRow {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 10px;
      border-radius: 999px;
      border: 1px solid rgba(127, 127, 127, .18);
      background: rgba(127, 127, 127, .08);
      font-size: 12px;
      font-weight: 650;
      color: var(--text);
    }

    .pill code {
      font-family: var(--mono);
      font-size: 12px;
    }

    .card {
      border-radius: var(--radius);
      border: 1px solid var(--border);
      background: var(--card);
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 12px 12px;
      border-bottom: 1px solid rgba(127, 127, 127, .14);
      flex-wrap: wrap;
    }

    .controls {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }

    .btn {
      appearance: none;
      border: 1px solid rgba(127, 127, 127, .24);
      background: rgba(255, 255, 255, .45);
      color: var(--text);
      text-decoration: none;
      border-radius: 999px;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 650;
      cursor: pointer;
      transition: transform .08s ease, background .12s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    @media (prefers-color-scheme: dark) {
      .btn { background: rgba(28, 31, 38, .65); }
    }

    .btn:active { transform: scale(.98); }

    .btnPrimary {
      border-color: rgba(0, 122, 255, .34);
      background: rgba(0, 122, 255, .12);
      color: var(--accent);
    }

    .select {
      border-radius: 999px;
      border: 1px solid rgba(127, 127, 127, .24);
      background: rgba(255, 255, 255, .45);
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 650;
      color: var(--text);
      outline: none;
      appearance: none;
    }

    @media (prefers-color-scheme: dark) {
      .select { background: rgba(28, 31, 38, .65); }
    }

    .status {
      font-size: 12px;
      color: var(--muted);
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      background: rgba(52, 199, 89, .95);
      box-shadow: 0 0 0 4px rgba(52, 199, 89, .12);
    }

    .dotOff {
      background: rgba(255, 59, 48, .95);
      box-shadow: 0 0 0 4px rgba(255, 59, 48, .12);
    }

    .rows {
      max-height: calc(100vh - 250px);
      overflow: auto;
      padding: 10px 12px 14px;
      display: grid;
      gap: 10px;
    }

    .row {
      border-radius: 18px;
      border: 1px solid rgba(127, 127, 127, .14);
      background: rgba(127, 127, 127, .06);
      padding: 10px 12px;
    }

    .meta {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .lvl {
      display: inline-flex;
      align-items: center;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .06em;
    }

    .lvlLog { background: var(--lvl-log); }
    .lvlInfo { background: var(--lvl-info); color: var(--accent); }
    .lvlWarn { background: var(--lvl-warn); color: #ff9500; }
    .lvlError { background: var(--lvl-error); color: #ff3b30; }
    .lvlDebug { background: var(--lvl-debug); color: #34c759; }

    .time, .id {
      font-family: var(--mono);
      font-size: 11px;
      color: var(--muted);
    }

    pre.msg {
      margin: 8px 0 0;
      padding: 0;
      font-family: var(--mono);
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .hint {
      color: var(--muted);
      font-size: 12px;
      padding: 0 2px;
    }
  </style>
</head>
<body>
  <main class="wrap">
    <header class="top">
      <div>
        <h1>运行日志</h1>
        <p class="sub">Cursor2API v${version} · 当前模型 <code>${model}</code> · 支持实时刷新与筛选。</p>
        <div class="pillRow" style="margin-top: 10px;">
          <div class="pill">Server <code>${escapeHtml(baseUrl)}</code></div>
          <div class="pill">OpenAI Base <code>${escapeHtml(openAIBaseUrl)}</code></div>
          <div class="pill">Buffer <span id="bufSize">${options.stats.size}</span>/<span id="bufCap">${options.stats.capacity}</span></div>
        </div>
      </div>

      <div class="controls">
        <a class="btn" href="/ui">信息</a>
        <button class="btn btnPrimary" type="button" id="btnFollow">停止跟随</button>
        <button class="btn" type="button" id="btnPause">暂停</button>
        <button class="btn" type="button" id="btnClear">清空</button>
        <select class="select" id="levelFilter" aria-label="filter">
          <option value="all">全部</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="log">Log</option>
          <option value="debug">Debug</option>
        </select>
      </div>
    </header>

    <section class="card">
      <div class="toolbar">
        <div class="status">
          <span class="dot" id="dot"></span>
          <span id="statusText">已连接</span>
          <span class="hint">lastId: <span id="lastId">${options.stats.lastId}</span></span>
        </div>
        <div class="hint">接口：<code>/api/logs</code> · SSE：<code>/api/logs/stream</code></div>
      </div>
      <div class="rows" id="rows">
        ${recentHtml || '<div class="hint">暂无日志</div>'}
      </div>
    </section>
  </main>

  <script>
    (function () {
      var stats = ${statsJson};
      var lastId = stats.lastId || 0;
      var paused = false;
      var follow = true;
      var filter = 'all';
      var es = null;
      var rows = document.getElementById('rows');
      var dot = document.getElementById('dot');
      var statusText = document.getElementById('statusText');
      var lastIdEl = document.getElementById('lastId');
      var bufSizeEl = document.getElementById('bufSize');
      var bufCapEl = document.getElementById('bufCap');
      var btnPause = document.getElementById('btnPause');
      var btnFollow = document.getElementById('btnFollow');

      function setConnected(ok) {
        if (ok) {
          dot.classList.remove('dotOff');
          statusText.textContent = paused ? '已暂停' : '已连接';
        } else {
          dot.classList.add('dotOff');
          statusText.textContent = paused ? '已暂停（离线）' : '连接断开';
        }
      }

      function fmt(ts) {
        var d = new Date(ts);
        var hh = String(d.getHours()).padStart(2, '0');
        var mm = String(d.getMinutes()).padStart(2, '0');
        var ss = String(d.getSeconds()).padStart(2, '0');
        var ms = String(d.getMilliseconds()).padStart(3, '0');
        return hh + ':' + mm + ':' + ss + '.' + ms;
      }

      function badge(level) {
        switch (level) {
          case 'error': return { text: 'ERROR', cls: 'lvl lvlError' };
          case 'warn': return { text: 'WARN', cls: 'lvl lvlWarn' };
          case 'info': return { text: 'INFO', cls: 'lvl lvlInfo' };
          case 'debug': return { text: 'DEBUG', cls: 'lvl lvlDebug' };
          default: return { text: 'LOG', cls: 'lvl lvlLog' };
        }
      }

      function escape(s) {
        return String(s)
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function rowHtml(entry) {
        var b = badge(entry.level);
        return '<div class="row" data-id="' + entry.id + '" data-level="' + escape(entry.level) + '">' +
          '<div class="meta">' +
            '<span class="' + b.cls + '">' + b.text + '</span>' +
            '<span class="time">' + escape(fmt(entry.ts)) + '</span>' +
            '<span class="id">#' + entry.id + '</span>' +
          '</div>' +
          '<pre class="msg">' + escape(entry.message) + '</pre>' +
        '</div>';
      }

      function shouldShow(level) {
        return filter === 'all' || filter === level;
      }

      function append(entry) {
        lastId = Math.max(lastId, entry.id);
        lastIdEl.textContent = String(lastId);

        var wrap = document.createElement('div');
        wrap.innerHTML = rowHtml(entry);
        var el = wrap.firstChild;
        if (filter !== 'all' && !shouldShow(entry.level)) {
          el.style.display = 'none';
        }
        rows.appendChild(el);

        if (follow) {
          rows.scrollTop = rows.scrollHeight;
        }
      }

      function applyFilter() {
        var nodes = rows.querySelectorAll('.row');
        for (var i = 0; i < nodes.length; i++) {
          var lvl = nodes[i].getAttribute('data-level');
          nodes[i].style.display = (filter === 'all' || filter === lvl) ? '' : 'none';
        }
      }

      function connect() {
        if (es) es.close();
        if (paused) {
          setConnected(false);
          return;
        }

        setConnected(true);
        es = new EventSource('/api/logs/stream?sinceId=' + encodeURIComponent(String(lastId)));

        es.addEventListener('stats', function (e) {
          try {
            var st = JSON.parse(e.data);
            if (typeof st.size === 'number') bufSizeEl.textContent = String(st.size);
            if (typeof st.capacity === 'number') bufCapEl.textContent = String(st.capacity);
          } catch (_) {}
        });

        es.addEventListener('log', function (e) {
          try {
            var entry = JSON.parse(e.data);
            append(entry);
          } catch (_) {}
        });

        es.onerror = function () {
          setConnected(false);
          if (paused) return;
          setTimeout(connect, 1200);
        };
      }

      document.getElementById('btnClear').addEventListener('click', async function () {
        try {
          await fetch('/api/logs/clear', { method: 'POST' });
          rows.innerHTML = '<div class="hint">暂无日志</div>';
          lastId = 0;
          lastIdEl.textContent = '0';
          connect();
        } catch (_) {}
      });

      btnPause.addEventListener('click', function () {
        paused = !paused;
        btnPause.textContent = paused ? '继续' : '暂停';
        setConnected(!paused);
        connect();
      });

      btnFollow.addEventListener('click', function () {
        follow = !follow;
        btnFollow.textContent = follow ? '停止跟随' : '跟随底部';
        if (follow) rows.scrollTop = rows.scrollHeight;
      });

      document.getElementById('levelFilter').addEventListener('change', function (e) {
        filter = e.target.value;
        applyFilter();
      });

      rows.addEventListener('wheel', function () {
        if (!follow) return;
        var atBottom = rows.scrollHeight - rows.scrollTop - rows.clientHeight < 8;
        if (!atBottom) {
          follow = false;
          btnFollow.textContent = '跟随底部';
        }
      }, { passive: true });

      connect();
    })();
  </script>
</body>
</html>`;
}
