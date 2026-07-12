# AssetFlow

Enterprise Asset & Resource Management System — a centralized ERP platform for tracking, allocating, and maintaining physical assets and shared resources (equipment, furniture, vehicles, rooms) across any organization.

## Team Members

| Name          |
| ------------- |
| Ansh Mehta    |
| Vivek Panchal |
| Aryan Mishra  |

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- [Prisma 7](https://www.prisma.io) + PostgreSQL
- [shadcn/ui](https://ui.shadcn.com) (base-ui) + Tailwind CSS v4
- React Hook Form + Zod
- JWT sessions via [jose](https://github.com/panva/jose)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```bash
# .env
DATABASE_URL=            # PostgreSQL connection string

ADMIN_NAME=               # used by the db seed to create the first Admin account
ADMIN_EMAIL=
ADMIN_PASSWORD=

SESSION_SECRET=           # random secret used to sign session JWTs
```

Generate a `SESSION_SECRET` with:

```bash
openssl rand -base64 32
```

### 3. Apply database migrations

Migrations are already committed to the repo, so just apply them - don't use `migrate dev` here, that's only for authoring a *new* migration:

```bash
npx prisma migrate deploy
```

### 4. Generate the Prisma client

```bash
npx prisma generate
```

### 5. Seed the database

Seeding creates the first Admin account from `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. All other accounts sign up as Employees and get promoted by this Admin from the Employee Directory.

```bash
npx prisma db seed
```

(equivalent to `npm run seed`)

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Useful Commands

| Command                   | Description                                   |
| -------------------------- | ---------------------------------------------- |
| `npm run dev`               | Start the dev server                          |
| `npm run build`             | Production build                              |
| `npm run start`             | Start the production server                   |
| `npm run lint`               | Run ESLint                                    |
| `npx prisma studio`         | Browse the database in a GUI                  |
| `npx prisma migrate deploy` | Apply existing migrations (use on a fresh DB) |
| `npx prisma migrate dev`    | Author a new migration after editing `schema.prisma` |
| `npx prisma db seed`         | Re-run the seed script                        |
| `npx prisma generate`        | Regenerate the Prisma client                  |
