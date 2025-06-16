# =============================================================================
# Base stage - Common dependencies and configuration
# =============================================================================
FROM node:22-alpine AS base
RUN apk add --no-cache dumb-init

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /usr/src/app

COPY --chown=nestjs:nodejs package*.json ./
COPY --chown=nestjs:nodejs tsconfig*.json ./
COPY --chown=nestjs:nodejs nest-cli.json ./

# =============================================================================
# Dependencies stage - Install all dependencies
# =============================================================================
FROM base AS deps

RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000

RUN --mount=type=cache,target=/root/.npm \
    npm ci --only=production --no-audit --no-fund && \
    cp -R node_modules /tmp/prod_node_modules

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# =============================================================================
# Build stage - Compile TypeScript
# =============================================================================
FROM base AS build

COPY --from=deps /usr/src/app/node_modules ./node_modules

COPY --chown=nestjs:nodejs src/ ./src/
COPY --chown=nestjs:nodejs test/ ./test/

RUN npm run build

RUN npm prune --production && \
    npm cache clean --force

# =============================================================================
# Test stage - Run tests and linting
# =============================================================================
FROM build AS test

COPY --from=deps /usr/src/app/node_modules ./node_modules

RUN npm run test
RUN npm run test:e2e
RUN npm run lint

# =============================================================================
# Production stage - Optimized for runtime
# =============================================================================
FROM node:22-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 -G nodejs

WORKDIR /usr/src/app

# Copy production dependencies
COPY --from=deps --chown=nestjs:nodejs /tmp/prod_node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nestjs:nodejs /usr/src/app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /usr/src/app/package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Switch to non-root user
USER nestjs

# Start the application
CMD ["dumb-init", "node", "dist/main.js"]