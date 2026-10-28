# EXPERIMENT 10 — frontend image (multi-stage: build with Node, serve with Nginx)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Same-origin by default: the browser calls /api and /socket.io on the page's own
# host, and Nginx (below) proxies them to the backend. Override at build time to
# point at an external API:  docker build --build-arg VITE_API_URL=https://api.example.com/api .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
# the official image renders *.template files with envsubst at start-up,
# so the backend address is configurable without rebuilding
ENV BACKEND_URL=http://backend:5000
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO /dev/null http://127.0.0.1/ || exit 1
