FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY game.contract.json ./
COPY src ./src
COPY web ./web
COPY scenarios ./scenarios
COPY tests ./tests
COPY scripts ./scripts
EXPOSE 8080
# Mặc định: mở game có giao diện (http://localhost:8080). Headless: docker run --rm ddl node src/headless/cli.js ...
CMD ["node", "src/server.js"]
