# server-strategy

Core **Node.js + TypeScript HTTP API server** for the _End to End Company Products_ system.

This service is responsible for:

- Exposing HTTP APIs (starting with authentication).
- Using shared DTOs and contracts from [`common-strategy`](https://github.com/Noamiz/common-strategy).
- Later: orchestrating business logic and persistence to PostgreSQL.

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

- Runtime:
  - Node.js (LTS recommended, e.g. 20+)
  - Express for HTTP routing
- Language:
  - TypeScript
- Tests:
  - Vitest + Supertest
- Linting:
  - ESLint + @typescript-eslint
- Shared types:
  - `common-strategy` (git dependency for now)

The server exposes JSON HTTP endpoints and always returns **`Result<T>`** bodies as defined in `common-strategy`:

- On success: `{ ok: true, data: T }`
- On error: `{ ok: false, error: ApiError }`

---

## Current Features

### Authentication (Email + 6-digit Code)

Endpoints under `/auth`:

1. `POST /auth/send-code`
   - Request body: `AuthSendCodeRequest`  
     (from `common-strategy`)
   - Behavior (MVP):
     - Validates `email`.
     - Stores an in-memory `{ email, code, expiresAt, attempts }` record.
     - Returns `Result<AuthSendCodeResponse>`:
       - `data.expiresAt`: when the code expires
       - `data.maskedDestination`: masked email (e.g. `u***@example.com`)
     - Error cases:
       - Invalid/missing email → 400 with `VALIDATION_ERROR`.

2. `POST /auth/verify-code`
   - Request body: `AuthVerifyCodeRequest`
   - Behavior (MVP):
     - Validates `email` and `code` (6-digit string).
     - Checks the in-memory verification store.
     - On success:
       - Returns `Result<AuthVerifyCodeSuccess>`:
         - `data.user`: `User` DTO
         - `data.token`: `AuthToken` DTO
     - Error cases:
       - Expired code → 400 with `VALIDATION_ERROR`.
       - Wrong code → 401 with `UNAUTHORIZED`.
       - Too many attempts → 429 with `TOO_MANY_REQUESTS`.

3. `GET /auth/me`
   - Behavior (MVP):
     - Returns a dummy `User` in `Result<AuthMeResponse>` with HTTP 200.
     - TODO: read token from headers and return real authenticated user.

See Confluence: `05 – APIs & Contracts → 5.1 – Authentication (Email + 6-digit Code)` for full contract details.

---

## Getting Started

### Prerequisites

- Node.js LTS (e.g. v20+)
- Yarn (classic) installed globally or via corepack

### Install dependencies

From the repo root:

````bash
yarn install
Run in development
bash
Copy code
yarn dev
By default the server listens on http://localhost:4000 (or PORT from env).

Scripts
Defined in package.json:

jsonc
Copy code
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "build": "tsc -p tsconfig.build.json",
    "start": "node dist/server.js",
    "test": "vitest",
    "lint": "eslint src --ext .ts"
  }
}
Common workflows:

yarn dev – start dev server with hot reload

yarn test – run test suite (Vitest + Supertest)

yarn lint – run ESLint

yarn build – compile TypeScript to dist/ for production

Project Structure
text
Copy code
server-strategy/
  src/
    app.ts             # Express app, JSON middleware, route registration
    server.ts          # HTTP server bootstrap (listens on PORT)
    routes/
      authRoutes.ts    # /auth/send-code, /auth/verify-code, /auth/me
    auth/
      validation.ts    # Hand-rolled validators for auth payloads
      codeStore.ts     # In-memory verification code store (MVP)
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
  SYSTEM_SYNC.md       # High-level system sync doc for AI tools and humans
As the product evolves, more domain modules and routes will be added under src/.

Testing
We follow the overall testing strategy defined in Confluence (6.1 – Testing Strategy & Quality Gates).

Currently:

Integration tests:

src/__tests__/authRoutes.test.ts:

Exercises /auth/send-code, /auth/verify-code, /auth/me.

Asserts HTTP status codes and Result<T> shapes using common-strategy types.

yarn test should always be green before merging.

Future work:

Add unit tests around validation.ts and codeStore.ts.

Add integration tests for future domain endpoints.

Add contract tests to ensure responses always match shared DTOs.

Related Repositories
common-strategy

gateway-strategy

web-client-strategy

mobile-client-strategy

ai-strategy

This service depends on common-strategy for shared types and contracts, and will be consumed by the web/mobile clients.

Documentation
Full system-level documentation lives in Confluence under:

End to End Company Products

Relevant sections:

01 – Vision & Strategy

02 – System Architecture

03 – Repositories → server-strategy

05 – APIs & Contracts → 5.1 – Authentication (Email + 6-digit Code)

06 – Operations → 6.1 – Testing Strategy & Quality Gates

06 – Operations → 6.2 – AI-Orchestrated Development (Target Vision)

If this README and Confluence ever disagree, Confluence is the source of truth and this file should be updated.

perl
Copy code

---

## 4) Cursor prompt to create SYSTEM_SYNC + README

Now, to let the **server-strategy** Cursor agent do the actual file work, paste this into that repo’s agent:

> We’re in the `server-strategy` repo.
> Right now, `README.md` is empty and there is no `SYSTEM_SYNC.md`.
>
> Please do the following:
>
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
>
> ```md
> [PASTE THE SYSTEM_SYNC.md CONTENT FROM ABOVE HERE]
> ```
>
> Here is the desired content for `README.md`:
>
> ```md
> [PASTE THE README.md CONTENT FROM ABOVE HERE]
> ```
>
> Please make sure the files are created exactly with this content (adjusting only line endings/formatting if necessary).
>
> Do not change any TypeScript or config files in this step unless required to keep build/tests green.

---

Once that’s done and green, we’ll have:

- `common-strategy`: contracts + docs.
- `server-strategy`: auth endpoints + tests + docs.

Then we can choose our next “big move”:

- Start the **`gateway-strategy` skeleton** (real-time hub).
- Or sketch **web-client / mobile-client** auth UIs that consume these endpoints.

We can pick that after you confirm the docs step is done.
::contentReference[oaicite:0]{index=0}
````
