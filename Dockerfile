FROM oven/bun:1-slim
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
ENV NODE_ENV=production DATA_DIR=/data PORT=3000
EXPOSE 3000
CMD ["bun", "src/server.ts"]
