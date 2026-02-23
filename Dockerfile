FROM node:18-slim

WORKDIR /app

# Install dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend (fix OpenSSL issue with older webpack)
RUN NODE_OPTIONS=--openssl-legacy-provider npm run build

# Prune dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/server.js"]
