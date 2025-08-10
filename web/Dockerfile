# Use Node.js 20 LTS
FROM node:20-alpine

# Build argument for API URL
ARG VITE_API_URL
# Default to localhost if not provided
ENV VITE_API_URL=${VITE_API_URL:-http://localhost:4000}

# Environment to avoid rollup native binary on musl/arm64
ENV ROLLUP_SKIP_NODEJS_NATIVE=true

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (include dev deps for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application (VITE_API_URL is embedded)
RUN npm run build

# Install serve to serve static files
RUN npm install -g serve

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S app -u 1001

# Change ownership
RUN chown -R app:nodejs /app

# Switch to non-root user
USER app

# Expose port
EXPOSE 3000

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
