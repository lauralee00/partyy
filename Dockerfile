FROM node:18-slim

WORKDIR /app

# Install dependencies (including dev for build)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build frontend
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server/server.js"]
