# =============================================================================
# Multi-stage Dockerfile for Pâtisserie Full-Stack Web Application
# Stage 1: Build React/Vite Frontend
# Stage 2: Production Node.js Server
# =============================================================================

# --- Stage 1: Build Client ---
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Install client dependencies
COPY client/package*.json ./
RUN npm ci

# Copy client source code and build
COPY client/ ./
RUN npm run build

# --- Stage 2: Production Server ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server code
COPY server/ ./server/

# Copy built client artifacts from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port (Cloud Run sets PORT=8080 automatically)
EXPOSE 5000

# Start server
CMD ["node", "server/index.js"]
