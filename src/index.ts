/**
 * Cursor2API v2 - 入口
 *
 * 将 Cursor 文档页免费 AI 接口代理为 Anthropic Messages API
 * 通过提示词注入让 Claude Code 拥有完整工具调用能力
 */

import 'dotenv/config';
import { createRequire } from 'module';
import express from 'express';
import { getConfig } from './config.js';
import { handleMessages, listModels, countTokens } from './handler.js';
import { handleOpenAIChatCompletions, handleOpenAIResponses } from './openai-handler.js';
import { renderHomePage } from './ui.js';
import { renderLogsPage } from './log-ui.js';
import {
    clearLogs,
    getLogStats,
    getLogsSince,
    getRecentLogs,
    installConsoleCapture,
    onLog,
} from './logs.js';

// 从 package.json 读取版本号，统一来源，避免多处硬编码
const require = createRequire(import.meta.url);
const { version: VERSION } = require('../package.json') as { version: string };


const app = express();
const config = getConfig();

installConsoleCapture();

function getBaseUrl(req: express.Request): string {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const forwardedHost = req.headers['x-forwarded-host'];
    const proto = (typeof forwardedProto === 'string' ? forwardedProto : '')
        .split(',')[0]
        .trim() || req.protocol;
    const host = (typeof forwardedHost === 'string' ? forwardedHost : '')
        .split(',')[0]
        .trim() || req.get('host') || `localhost:${config.port}`;
    return `${proto}://${host}`;
}

// 解析 JSON body（增大限制以支持 base64 图片，单张图片可达 10MB+）
app.use(express.json({ limit: '50mb' }));

// CORS
app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (_req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
});

// 简单访问日志（可在 /logs 中实时查看）
app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - startedAt;
        console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
});

// ==================== 路由 ====================

// Anthropic Messages API
app.post('/v1/messages', handleMessages);
app.post('/messages', handleMessages);

// OpenAI Chat Completions API（兼容）
app.post('/v1/chat/completions', handleOpenAIChatCompletions);
app.post('/chat/completions', handleOpenAIChatCompletions);

// OpenAI Responses API（Cursor IDE Agent 模式）
app.post('/v1/responses', handleOpenAIResponses);
app.post('/responses', handleOpenAIResponses);

// Token 计数
app.post('/v1/messages/count_tokens', countTokens);
app.post('/messages/count_tokens', countTokens);

// OpenAI 兼容模型列表
app.get('/v1/models', listModels);

// 健康检查
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: VERSION });
});

// 根路径
app.get('/', (_req, res) => {
    const accept = _req.get('accept') || '';
    // 仅在浏览器显式声明接受 HTML 时才返回 UI。
    // 避免 curl/脚本默认的 "*/*" 被协商为 HTML，导致根路径 JSON 变更。
    if (accept.includes('text/html')) {
        res.type('html').send(renderHomePage({
            version: VERSION,
            baseUrl: getBaseUrl(_req),
            model: config.cursorModel,
        }));
        return;
    }
    res.json({
        name: 'cursor2api',
        version: VERSION,
        description: 'Cursor Docs AI → Anthropic & OpenAI & Cursor IDE API Proxy',
        endpoints: {
            anthropic_messages: 'POST /v1/messages',
            openai_chat: 'POST /v1/chat/completions',
            openai_responses: 'POST /v1/responses',
            models: 'GET /v1/models',
            health: 'GET /health',
        },
        usage: {
            claude_code: 'export ANTHROPIC_BASE_URL=http://localhost:' + config.port,
            openai_compatible: 'OPENAI_BASE_URL=http://localhost:' + config.port + '/v1',
            cursor_ide: 'OPENAI_BASE_URL=http://localhost:' + config.port + '/v1 (选用 Claude 模型)',
        },
    });
});

// 可选：显式 UI 路由（不依赖 Accept 头）
app.get('/ui', (req, res) => {
    res.type('html').send(renderHomePage({
        version: VERSION,
        baseUrl: getBaseUrl(req),
        model: config.cursorModel,
    }));
});

// Logs UI
app.get('/logs', (req, res) => {
    res.type('html').send(renderLogsPage({
        version: VERSION,
        baseUrl: getBaseUrl(req),
        model: config.cursorModel,
        stats: getLogStats(),
        recent: getRecentLogs(200),
    }));
});

// ==================== Logs API ====================

app.get('/api/logs', (req, res) => {
    const limitRaw = Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit;
    const sinceIdRaw = Array.isArray(req.query.sinceId) ? req.query.sinceId[0] : req.query.sinceId;
    const limit = Math.min(2000, Math.max(1, parseInt(String(limitRaw ?? '200'), 10) || 200));
    const sinceId = parseInt(String(sinceIdRaw ?? '0'), 10) || 0;

    const logs = sinceId > 0 ? getLogsSince(sinceId) : getRecentLogs(limit);
    res.json({ stats: getLogStats(), logs });
});

app.post('/api/logs/clear', (_req, res) => {
    clearLogs();
    res.json({ ok: true, stats: getLogStats() });
});

app.get('/api/logs/stream', (req, res) => {
    const sinceIdRaw = Array.isArray(req.query.sinceId) ? req.query.sinceId[0] : req.query.sinceId;
    const sinceId = parseInt(String(sinceIdRaw ?? '0'), 10) || 0;

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    const flushHeaders = (res as unknown as { flushHeaders?: () => void }).flushHeaders;
    if (typeof flushHeaders === 'function') flushHeaders.call(res);

    const send = (event: string, data: unknown) => {
        try {
            res.write(`event: ${event}\n`);
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
            // ignore
        }
    };

    // 先补发 sinceId 之后的日志
    for (const entry of getLogsSince(sinceId)) {
        send('log', entry);
    }
    send('stats', getLogStats());

    const off = onLog(entry => send('log', entry));
    const statsTimer = setInterval(() => send('stats', getLogStats()), 5000);
    const heartbeatTimer = setInterval(() => {
        try {
            res.write(`: ping\n\n`);
        } catch {
            // ignore
        }
    }, 15000);

    req.on('close', () => {
        clearInterval(statsTimer);
        clearInterval(heartbeatTimer);
        off();
    });
});

// ==================== 启动 ====================

app.listen(config.port, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════╗');
    console.log(`  ║        Cursor2API v${VERSION.padEnd(21)}║`);
    console.log('  ╠══════════════════════════════════════╣');
    console.log(`  ║  Server:  http://localhost:${config.port}      ║`);
    console.log('  ║  Model:   ' + config.cursorModel.padEnd(26) + '║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log('  ║  API Endpoints:                      ║');
    console.log('  ║  • Anthropic: /v1/messages            ║');
    console.log('  ║  • OpenAI:   /v1/chat/completions     ║');
    console.log('  ║  • Cursor:   /v1/responses            ║');
    console.log('  ╠══════════════════════════════════════╣');
    console.log('  ║  Claude Code:                        ║');
    console.log(`  ║  export ANTHROPIC_BASE_URL=           ║`);
    console.log(`  ║    http://localhost:${config.port}              ║`);
    console.log('  ║  OpenAI / Cursor IDE:                 ║');
    console.log(`  ║  OPENAI_BASE_URL=                     ║`);
    console.log(`  ║    http://localhost:${config.port}/v1            ║`);
    console.log('  ╚══════════════════════════════════════╝');
    console.log('');
});
