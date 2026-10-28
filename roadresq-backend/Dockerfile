# EXPERIMENT 10 — backend image
# Small, reproducible, and not running as root.
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# install production deps first so this layer is cached until package*.json changes
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node . .

# never run the app as root inside the container
USER node
EXPOSE 5000

# Docker (and Compose's depends_on: service_healthy) uses this to know
# when the API is actually ready — which also requires the DB connection
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
