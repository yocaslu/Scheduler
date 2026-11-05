# Scheduler

Sistema de agendamento de atendimentos com três perfis:

| Perfil | Como entra | O que pode fazer |
| --- | --- | --- |
| Administrador | E-mail e senha do `.env` (`ADMIN_USER` / `ADMIN_PASSWORD`) ou usuário com perfil "Administrador" | Tudo: agendamentos, pendências, usuários da equipe e cidadãos |
| Balconista (`visualizador`) | Usuário criado pelo administrador no painel | Ver e criar agendamentos |
| Cidadão | Cria a própria conta em `/cadastro.html` | Agendar em dias úteis, ver e cancelar os próprios pedidos pendentes |

Backend em NestJS + Prisma + MariaDB; frontend em HTML e JavaScript servido pelo próprio Nest.

## Rodar com Docker

Requisito: Docker com Compose v2 (Docker Desktop no Windows ou macOS).

```bash
git clone https://github.com/mucamonter/Scheduler.git
cd Scheduler
cp .env.example .env      # preencha as senhas e o SESSION_SECRET
docker compose up --build
```

Acesse <http://localhost:3000> e entre com `ADMIN_USER` e `ADMIN_PASSWORD`.

O Compose sobe três serviços, nesta ordem:

1. `db`: MariaDB, com os dados no volume `mysql_data`.
2. `migrate`: aplica as migrations de `prisma/migrations` e termina.
3. `app`: a aplicação na porta 3000.

## Rodar em desenvolvimento

Requisitos: Node 24 ou mais novo e pnpm 10.

```bash
pnpm install
cp .env.example .env      # ajuste DATABASE_URL para o seu banco local
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev
```

Para usar só o banco do Docker, descomente a linha `ports` do serviço `db` no `docker-compose.yml` e rode `docker compose up db`.

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Sobe a API com recarga automática |
| `pnpm test` | Roda os testes unitários e e2e (não precisam de banco) |
| `pnpm lint` | Verifica o código com ESLint |
| `pnpm format` | Formata o código com Prettier |
| `pnpm exec prisma migrate dev --name <nome>` | Cria uma migration depois de alterar `prisma/schema.prisma` |

## Banco já existente (criado com `prisma db push`)

Versões anteriores criavam as tabelas com `prisma db push`, sem histórico de migrations. Para um banco desses, marque a migration inicial como aplicada uma única vez antes de subir:

```bash
docker compose run --rm migrate pnpm exec prisma migrate resolve --applied 0_init
docker compose up --build
```

A migration `1_slot_unico` impede dois agendamentos no mesmo horário. Se o banco já tiver horários duplicados, ela falha; remova as duplicatas antes.

## Estrutura

```text
src/
  main.ts, app.module.ts, app.setup.ts
  auth/           login, sessão, papéis (enum + decorator + guard)
  agendamentos/   disponibilidade, pedidos do cidadão e painel
  cidadaos/       cadastro e área do cidadão, gestão pelo admin
  usuarios/       usuários da equipe
  prisma/         PrismaService
  common/         datas, horários do expediente, filtro de erros
test/             testes e2e
prisma/           schema e migrations
app/              frontend (HTML, CSS e JS)
```

## API

Todas as rotas começam com `/api`.

| Método e rota | Acesso |
| --- | --- |
| `POST /login`, `POST /logout` | Público |
| `GET /agendamentos/disponiveis?data=AAAA-MM-DD` | Público |
| `POST /agendamentos` | Cidadão |
| `POST /cidadao/cadastro` | Público |
| `GET /cidadao/me`, `GET /cidadao/meus-agendamentos`, `PATCH /cidadao/agendamentos/:id/cancelar` | Cidadão |
| `GET /admin/me`, `GET /admin/horarios`, `GET` e `POST /admin/agendamentos`, `GET /admin/agendamentos/:id/detalhes` | Administrador e balconista |
| `PATCH` e `DELETE /admin/agendamentos/:id`, `GET /admin/pendencias` | Administrador |
| `/admin/usuarios`, `/admin/cidadaos` | Administrador |

## Licença

MIT. Veja o arquivo [LICENSE](LICENSE).
