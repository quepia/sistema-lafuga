FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
EXPOSE 3018

CMD ["node", "--no-warnings", "--experimental-strip-types", "./mcp/server.ts"]
