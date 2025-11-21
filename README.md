# server-strategy

Core **Node.js + TypeScript HTTP API server** for the _End to End Company Products_ system.

This service is responsible for:

- Exposing HTTP APIs (starting with authentication).
- Using shared DTOs and contracts from [`common-strategy`](https://github.com/Noamiz/common-strategy).
- Orchestrating business logic and, later, persistence to PostgreSQL.

---

## Table of Contents

- [Architecture](#architecture)
- [Current Features](#current-features)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [Related Repositories](#related-repositories)
- [Documentation](#documentation)

---

## Architecture

- **Runtime:** Node.js LTS (20+ recommended) with Express for HTTP routing.
- **Language:** TypeScript.
- **Testing:** Vitest + Supertest.
- **Linting:** ESLint + `@typescript-eslint`.
- **Shared types:** `common-strategy` (git dependency).

All HTTP responses follow the `Result<T>` contract from `common-strategy`:

- Success → `{ ok: true, data: T }`
- Error → `{ ok: false, error: ApiError }`

---

## Current Features

### Authentication (Email + 6-digit Code)

Endpoints under `/auth`:

1. **`POST /auth/send-code`**
   - Request body: `AuthSendCodeRequest`.
   - Validates the email, stores `{ email, code, expiresAt, attempts }` in memory, and returns `Result<AuthSendCodeResponse>` with expiration metadata and a masked destination.
   - Invalid or missing email returns HTTP 400 with `VALIDATION_ERROR`.

2. **`POST /auth/verify-code`**
   - Request body: `AuthVerifyCodeRequest`.
   - Validates `email` and `code`, checks the in-memory store, and on success returns `Result<AuthVerifyCodeSuccess>` (`user` + `token` DTOs).
   - Error cases:
     - Expired code → 400 `VALIDATION_ERROR`
     - Wrong code → 401 `UNAUTHORIZED`
     - Too many attempts → 429 `TOO_MANY_REQUESTS`

3. **`GET /auth/me`**
   - Returns a placeholder `User` via `Result<AuthMeResponse>` (HTTP 200).
   - TODO: read auth token from headers and return the real user.

See Confluence: `05 – APIs & Contracts → 5.1 – Authentication (Email + 6-digit Code)` for full details.

---

## Getting Started

### Prerequisites

- Node.js LTS (20+).
- Yarn classic (global install or via corepack).

### Install & Run

```bash
yarn install
yarn dev
```

By default the server listens on `http://localhost:4000` (override via `PORT`).

---

## Scripts

Defined in `package.json`:

```jsonc
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  }
}
```

Common workflows:

- `yarn dev` – start dev server with hot reload.
- `yarn test` – run Vitest + Supertest suite.
- `yarn lint` – run ESLint.
- `yarn build` – compile to `dist/` for production.

---

## Project Structure

```
server-strategy/
  src/
    app.ts              # Express app, JSON middleware, route registration
    server.ts           # HTTP server bootstrap (listens on PORT)
    routes/
      authRoutes.ts     # /auth/send-code, /auth/verify-code, /auth/me
    auth/
      validation.ts     # Hand-rolled validators for auth payloads
      codeStore.ts      # In-memory verification code store (MVP)
    __tests__/
      authRoutes.test.ts  # Integration tests for the /auth endpoints
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  .eslintrc.cjs
  .prettierrc
  .gitignore
  package.json
  README.md
  SYSTEM_SYNC.md         # High-level sync doc for AI tools and humans
```

As the product evolves, additional domain modules and routes will land under `src/`.

---

## Testing

We follow the testing strategy defined in Confluence (`6.1 – Testing Strategy & Quality Gates`).

Current coverage:

- `src/__tests__/authRoutes.test.ts`
  - Exercises `/auth/send-code`, `/auth/verify-code`, `/auth/me`.
  - Asserts HTTP status codes and `Result<T>` shapes using shared DTOs.

`yarn test` must be green before merging.

Future enhancements:

- Unit tests for `validation.ts` and `codeStore.ts`.
- Integration tests for future domain endpoints.
- Contract tests to keep responses aligned with shared DTOs.

---

## Related Repositories

- `common-strategy`
- `gateway-strategy`
- `web-client-strategy`
- `mobile-client-strategy`
- `ai-strategy`

This service depends on `common-strategy` and is consumed by the web/mobile clients.

---

## Documentation

System-level docs live in Confluence (`End to End Company Products`). Relevant sections:

- `01 – Vision & Strategy`
- `02 – System Architecture`
- `03 – Repositories → server-strategy`
- `05 – APIs & Contracts → 5.1 – Authentication (Email + 6-digit Code)`
- `06 – Operations → 6.1 – Testing Strategy & Quality Gates`
- `06 – Operations → 6.2 – AI-Orchestrated Development (Target Vision)`

If this README ever diverges from Confluence, treat Confluence as the source of truth and update this file.

---

## Cursor prompt to create SYSTEM_SYNC + README

To reproduce the documentation setup via Cursor, paste the following into the `server-strategy` repo agent:

> We’re in the `server-strategy` repo.  
> Right now, `README.md` is empty and there is no `SYSTEM_SYNC.md`.  
>  
> Please do the following:  
> 1. **Create or overwrite `SYSTEM_SYNC.md`** in the repo root with the content I’m about to give you.  
> 2. **Overwrite `README.md`** in the repo root with the content I’m about to give you.  
> 3. After modifying these files, run:  
>    - `yarn build`  
>    - `yarn test`  
>    - `yarn lint`  
>    to ensure nothing broke (they should still be ✅).  
> 4. Summarize what you changed and confirm the statuses of `yarn build`, `yarn test`, and `yarn lint`.  
>  
> Here is the desired content for `SYSTEM_SYNC.md`:  
> ```md
> [PASTE THE SYSTEM_SYNC.md CONTENT FROM ABOVE HERE]
> ```  
>  
> Here is the desired content for `README.md`:  
> ```md
> [PASTE THE README.md CONTENT FROM ABOVE HERE]
> ```  
>  
> Please make sure the files are created exactly with this content (adjusting only line endings/formatting if necessary).  
> Do not change any TypeScript or config files in this step unless required to keep build/tests green.  
>  
> Once that’s done and green, we’ll have:  
> - `common-strategy`: contracts + docs.  
> - `server-strategy`: auth endpoints + tests + docs.  
>  
> Then we can pick our next “big move”:  
> - Start the **`gateway-strategy` skeleton** (real-time hub).  
> - Or sketch **web-client / mobile-client** auth UIs that consume these endpoints.  
>  
> We can decide after you confirm the docs step is done.

