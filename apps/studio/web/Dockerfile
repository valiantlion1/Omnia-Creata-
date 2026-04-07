FROM node:20-alpine AS builder

WORKDIR /workspace/web

ARG VITE_API_BASE_URL=/api
ARG VITE_AUTH_REDIRECT_BASE_URL=

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_AUTH_REDIRECT_BASE_URL=${VITE_AUTH_REDIRECT_BASE_URL}

COPY web/package*.json ./
RUN npm ci

COPY web/ ./

RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
