# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# Public origin used for canonical/OG/sitemap URLs on the landing page
ARG VITE_SITE_URL
ARG VITE_API_URL
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA fallback configuration
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /app.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

