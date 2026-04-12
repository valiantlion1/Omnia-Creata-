FROM node:20-alpine AS builder

WORKDIR /app

# Install deps (cache layer)
COPY web/package.json web/package-lock.json* ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install

# Copy source
COPY web/ ./
COPY version.json ./version.json
COPY version.json /version.json

# Build for production
ARG VITE_API_BASE_URL=https://api.omniacreata.com
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# --- Production image ---
FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html
COPY web/nginx.staging.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
