FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL, postgresql-client for backups, and cloudflared
RUN apk add --no-cache openssl postgresql-client wget && \
    ARCH=$(apk --print-arch) && \
    case "$ARCH" in \
        x86_64) CLOUDFLARED_ARCH="amd64" ;; \
        aarch64) CLOUDFLARED_ARCH="arm64" ;; \
        *) echo "Unsupported architecture: $ARCH" && exit 1 ;; \
    esac && \
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CLOUDFLARED_ARCH} -O /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared && \
    apk del wget

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy full node_modules (standalone mode doesn't bundle React 19 properly)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Copy Prisma schema for runtime migrations
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Create backups directory AFTER copying all files with proper permissions
RUN mkdir -p backups && chown -R nextjs:nodejs backups && chmod -R 755 backups

# Create startup script with cloudflared
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
# Start cloudflared tunnel in background if credentials are provided\n\
if [ "$DISABLE_CLOUDFLARE" != "true" ] && [ -f "/app/.cloudflared/credentials.json" ]; then\n\
  echo "Starting Cloudflare tunnel..."\n\
  (\n\
    while true; do\n\
      echo "$(date): Starting cloudflared tunnel"\n\
      cloudflared tunnel --config /app/cloudflared.yml run\n\
      EXIT_CODE=$?\n\
      echo "$(date): cloudflared exited with code $EXIT_CODE, restarting in 5 seconds..."\n\
      sleep 5\n\
    done\n\
  ) &\n\
  echo "Cloudflare tunnel monitor started"\n\
else\n\
  echo "Cloudflare tunnel disabled or credentials not found"\n\
fi\n\
\n\
# Start Next.js application\n\
echo "Starting Next.js application..."\n\
exec node server.js\n\
' > /app/start.sh && chmod +x /app/start.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000

CMD ["/app/start.sh"]
