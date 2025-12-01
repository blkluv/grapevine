# Build stage
FROM node:20-alpine AS build

# Install build dependencies for native modules (bufferutil, utf-8-validate, keccak)
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files first
COPY grapevine-api/package.json ./

# Install dependencies
RUN pnpm install

# Copy source files (excluding node_modules)
COPY grapevine-api/src ./src
COPY grapevine-api/tsconfig.json grapevine-api/schema.sql ./

# Build TypeScript
RUN pnpm run build

# Production stage
FROM node:20-alpine AS release

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

WORKDIR /app

# Copy package files
COPY grapevine-api/package.json ./

# Create non-root user first
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Install only production dependencies (as root, node can read them)
RUN pnpm install --prod

# Clean up build dependencies to reduce image size
RUN apk del python3 make g++

# Copy built files from build stage with correct ownership
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/schema.sql ./schema.sql

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Set environment
ENV NODE_ENV=production \
    PORT=3000

# Start the application
CMD ["node", "dist/index.js"]
