# ==== Base ====
# Alpine + QEMU/buildx 在 npm 安装原生模块时更容易触发非法指令/总线错误，
# 改用 Debian slim 并在构建阶段完成原生依赖编译，运行阶段直接复用产物。
FROM node:22-bookworm-slim AS base

WORKDIR /app

# ==== Stage 1: 构建阶段 (Builder) ====
FROM base AS builder

# better-sqlite3 在部分架构下需要本地编译，保留最小构建工具链。
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# 先安装依赖，最大化利用 Docker 缓存。
COPY package.json package-lock.json ./
RUN npm ci

# 拷贝项目源代码并执行 TypeScript 编译
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 编译完成后裁剪 devDependencies，缩小运行镜像体积。
RUN npm prune --omit=dev \
    && npm cache clean --force

# ==== Stage 2: 生产运行阶段 (Runner) ====
FROM base AS runner

# 设置为生产环境
ENV NODE_ENV=production

# 增大 Node.js 堆内存上限，防止日志文件过大时加载 OOM（tesseract.js / js-tiktoken 初始化也有一定内存需求）
ENV NODE_OPTIONS="--max-old-space-size=4096"

# 出于安全考虑，避免使用 root 用户运行服务
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid 1001 cursor

# 复用 builder 阶段已经编译并裁剪过的依赖，避免在运行阶段再次执行 npm ci。
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=cursor:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=cursor:nodejs /app/dist ./dist

# 拷贝前端静态资源（日志查看器 Web UI）
COPY --chown=cursor:nodejs public ./public

# 创建日志目录并授权
RUN mkdir -p /app/logs && chown cursor:nodejs /app/logs

# 注意：config.yaml 不打包进镜像，通过 docker-compose volumes 挂载
# 如果未挂载，服务会使用内置默认值 + 环境变量

# 切换到非 root 用户
USER cursor

# 声明对外暴露的端口和持久化卷
EXPOSE 3010
VOLUME ["/app/logs"]

# 启动服务
CMD ["npm", "start"]
