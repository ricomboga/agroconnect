FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/kafka/package.json ./packages/kafka/
COPY apps/farm-service/package.json ./apps/farm-service/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/farm-service/ ./apps/farm-service/
COPY tsconfig.base.json ./

RUN pnpm --filter @agroconnect/db generate:farm
RUN pnpm --filter @agroconnect/farm-service build

FROM node:20-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY --from=builder /app/apps/farm-service/dist ./dist
COPY --from=builder /app/apps/farm-service/node_modules ./node_modules
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
