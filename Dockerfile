FROM node:20-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
	python3 \
	make \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=server.mjs
RUN npm prune --omit=dev

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends \
	python3 \
	make \
	g++ \
	&& rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev \
	&& npm install --omit=dev express-session@1.19.0 \
	&& node -e "import('express-session').then(() => console.log('express-session resolved')).catch((error) => { console.error(error); process.exit(1); })" \
	&& npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.mjs ./server.mjs

EXPOSE 3000
CMD ["node", "server.mjs"]