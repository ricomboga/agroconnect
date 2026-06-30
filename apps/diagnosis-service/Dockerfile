FROM node:20-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/kafka/package.json   ./packages/kafka/
COPY packages/shared/package.json  ./packages/shared/
COPY apps/diagnosis-service/package.json ./apps/diagnosis-service/

RUN pnpm install --filter @agroconnect/diagnosis-service... --no-frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/diagnosis-service/ ./apps/diagnosis-service/

WORKDIR /workspace/apps/diagnosis-service
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/kafka/package.json   ./packages/kafka/
COPY packages/shared/package.json  ./packages/shared/
COPY apps/diagnosis-service/package.json ./apps/diagnosis-service/

RUN pnpm install --filter @agroconnect/diagnosis-service... --no-frozen-lockfile --prod

COPY --from=builder /workspace/apps/diagnosis-service/dist ./apps/diagnosis-service/dist
COPY --from=builder /workspace/packages/ ./packages/

ENV NODE_ENV=production
WORKDIR /workspace/apps/diagnosis-service
EXPOSE 8000
CMD ["node", "dist/index.js"]
