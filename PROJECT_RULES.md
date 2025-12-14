# Admin Project Rules

## UI & Components

- Always use **shadcn/ui** for UI components when a suitable component exists.
- **Do not** copy component code manually from the shadcn website.
- **Preferred way to add components:**
  - Run `npx shadcn@latest add <component-name>` from the `admin` folder.
  - Example: `npx shadcn@latest add button card input dialog table`.

## shadcn/ui & Tailwind

- This project uses **Next.js App Router**, **React 19**, and **Tailwind CSS v4**.
- Install and configure shadcn/ui using the **official CLI**:
  - `npx shadcn@latest init` in the `admin` folder.
  - Follow prompts for Next.js + TypeScript + Tailwind CSS + App Router.

## GraphQL & Backend Architecture

- The **GraphQL server lives inside the Next.js admin app** at `/api/graphql`.
- GraphQL is implemented using:
  - `graphql-yoga`
  - `@graphql-tools/schema`
- GraphQL resolvers access the database **directly via Prisma** (no Phoenix in this path, for now).

## Database & Prisma

- All tables owned by this admin app are **prefixed with `fdh_`** in Postgres.
  - Example: `fdh_mobile_users`.
- Prisma models use clean names and map to `fdh_` tables using `@@map` and `@map`.
- `MobileUser` model (`fdh_mobile_users`) rules:
  - Enum `MobileUserContext` values:
    - `MOBILE_BANKING`, `WALLET`, `VILLAGE_BANKING`, `AGENT`, `MERCHANT`.
  - Supports different login requirements per context, for example:
    - `MOBILE_BANKING`: `username` + `passwordHash`.
    - `WALLET`: `phoneNumber` + `pinHash`.

## Docker & Development Workflow

- The `adminpanel` service is for **development**:
  - Uses `image: node:20-alpine`.
  - Mounts the local `./admin` directory into `/app` in the container.
  - Runs `npm install && npm run dev`.
- Nginx proxies `/adminpanel` to `adminpanel:3000`.
- Any changes under `admin/` are reflected live via the Next.js dev server.
