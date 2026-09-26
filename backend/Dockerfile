FROM node:26-alpine3.23 AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS app
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server.js"]
