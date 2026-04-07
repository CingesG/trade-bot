# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/services ./services
COPY --from=builder /app/config.ts ./
COPY --from=builder /app/src/lib/firebaseAdmin.ts ./src/lib/firebaseAdmin.ts
COPY --from=builder /app/firebase-applet-config.json ./

RUN npm install --omit=dev && npm install -g tsx

EXPOSE 3000
ENV NODE_ENV=production
CMD ["tsx", "server.ts"]
