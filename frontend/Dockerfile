# =========================================================
# Frontend Dockerfile - Wildlife Population Intelligence System
# Multi-stage build: Vite build -> served by nginx
# (Used for local docker-compose runs; production deploy uses Vercel directly)
# =========================================================

# ---- Stage 1: Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- Stage 2: Serve ----
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
