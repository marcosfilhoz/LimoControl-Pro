# LimoControl API (Express + TypeScript)

API leve para controle de viagens. Usa dados em memória por padrão e **usa Postgres automaticamente** quando `DATABASE_URL` estiver configurada.

## Requisitos
- Node.js 18+ e npm instalados (não estavam disponíveis no ambiente ao tentar rodar).

## Instalação
```bash
cd backend
npm install
```

## Execução em desenvolvimento
```bash
npm run dev
```
API em `http://localhost:4000`.

## Build e produção
```bash
npm run build
npm start
```

## Variáveis de ambiente
Copie `env.example` para `.env` e ajuste:
- `PORT` (default 4000)
- `DATABASE_URL` (Postgres)
- `JWT_SECRET` (obrigatório em produção)
- `CORS_ORIGIN` (domínio(s) permitido(s), separado por vírgula)
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (opcional; cria admin se o banco estiver vazio)

## Rotas atuais
- `GET /health`
- `POST /auth/login` (admin seed: `admin@limo.local` / `admin`)
- CRUD: `/users` (admin-only), `/drivers`, `/clients`, `/companies`, `/trips`
- Dashboard: `GET /dashboard`

## Próximos passos sugeridos
- Configurar `CORS_ORIGIN` para o domínio do front em produção.
- Colocar `JWT_SECRET` forte e rotacionar periodicamente.
- Configurar deploy (Render/Railway para API, Supabase/Neon para banco).

