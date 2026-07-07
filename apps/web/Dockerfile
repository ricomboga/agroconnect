FROM node:20-alpine
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json   ./packages/shared/
COPY packages/web-auth/package.json ./packages/web-auth/
COPY packages/web-ui/package.json   ./packages/web-ui/
COPY apps/web/package.json          ./apps/web/

RUN pnpm install --filter @agroconnect/web... --no-frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared/   ./packages/shared/
COPY packages/web-auth/ ./packages/web-auth/
COPY packages/web-ui/   ./packages/web-ui/
COPY apps/web/          ./apps/web/

WORKDIR /workspace/apps/web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN pnpm build

EXPOSE 3001
CMD ["pnpm", "start"]
