# ---------- Estágio de build ----------
FROM node:24-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm exec prisma generate && pnpm run build

# ---------- Só dependências de produção ----------
# Parte do build (que já tem o cliente Prisma gerado) e remove as devDependencies.
# O serviço `migrate` usa o estágio build, que mantém o CLI do Prisma.
FROM build AS prod-deps
RUN CI=true pnpm prune --prod

# ---------- Imagem final ----------
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
COPY --chown=node:node app ./app

USER node
EXPOSE 3000
CMD ["node", "dist/main"]
