FROM node:20-alpine AS base
RUN apk add --no-cache vips-dev python3 make g++
WORKDIR /app

FROM base AS builder
COPY package.json ./
COPY ../../packages/shared/package.json ../../packages/shared/package.json
RUN npm install --ignore-scripts
COPY . .
COPY ../../packages/shared ../../packages/shared
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3009
CMD ["node", "dist/index.js"]
