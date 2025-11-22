# System Sync – End to End Company Products

## 1. Purpose of This File

This document gives **AI coding tools (Cursor, ChatGPT, etc.)** and developers a compact overview of:

- The overall multi-repo system.
- The role of this specific repository: `server-strategy`.
- Where to find deeper documentation (Confluence).

When starting a new session or a big change, load/reference this file so the agent understands the **whole picture**.

---

## 2. Global System Overview

We are building a **multi-service, multi-app architecture** with 6 main repositories:

1. **common-strategy**  
   Shared TypeScript library: types, DTOs, constants, logging interfaces, and API contracts used by all other repos.

2. **server-strategy**  
   Core Node.js TypeScript HTTP API server: auth, user management, business logic, PostgreSQL access, Swagger/OpenAPI docs.

3. **gateway-strategy**  
   Node.js TypeScript real-time gateway running behind Nginx (on a NUC or similar LAN device).  
   Handles secure WebSocket connections and acts as a hub for real-time communication between services and clients.

4. **web-client-strategy**  
   React + TypeScript web application.  
   Dashboard for users of all levels. Talks to `server-strategy` over HTTP and `gateway-strategy` for real-time features.

5. **mobile-client-strategy**  
   React Native + Expo + TypeScript mobile application.  
   Users can register/login (e.g., via email + 6-digit code), and interact with the system via `server-strategy` and `gateway-strategy`.

6. **ai-strategy**  
   AI/ML services (to be defined later).  
   Consumes data from `server-strategy` and/or `gateway-strategy` and returns insights or predictions.

### Key Principles

- **TypeScript everywhere** – shared types from `common-strategy` are the source of truth for DTOs and envelopes.
- **Separation of concerns**:
  - `server-strategy` = core HTTP APIs + DB.
  - `gateway-strategy` = real-time WebSocket routing.
  - `web-client` / `mobile-client` = UI and UX.
  - `ai-strategy` = advanced logic/insights.
- **Production mindset**:
  - Real domains and hosting.
  - Real PostgreSQL databases.
  - CI/CD and logging in every service.

---

## 3. This Repo: `server-strategy`

**Role**:  
`server-strategy` is the **core HTTP API** for the system.

**Responsibilities (current & planned)**:

- **Authentication & user management**
  - Email + 6-digit code login/registration flow.
  - Token issuance and validation (AuthToken from `common-strategy`).
  - `/auth/send-code`, `/auth/verify-code`, `/auth/me` endpoints.
- **Admin tooling support**
  - Read-only Users listing via `GET /admin/users` for `internal-tool-strategy`.
  - Currently backed by an in-memory catalog; will migrate to PostgreSQL once available.

- **Core business APIs** (later)
  - Domain-specific operations for the product (to be defined).
  - Will reuse DTOs from `common-strategy`.

- **Persistence**
  - Access to PostgreSQL (later; currently using in-memory storage for verification codes and admin users).
  - Data access layer and migrations.

- **Contracts & error model**
  - Uses `Result<T>` and `ApiError` from `common-strategy`.
  - Maps domain/validation errors to consistent HTTP status codes.

**Current Auth Implementation (MVP)**:

- `POST /auth/send-code`
  - Validates email payload.
  - Creates an in-memory verification record with a 6-digit code (placeholder).
  - Returns `Result<AuthSendCodeResponse>` (expiresAt, masked email) on 200.
  - On invalid email → 400 with `VALIDATION_ERROR`.

- `POST /auth/verify-code`
  - Validates email + code.
  - Verifies against in-memory store.
  - On success → 200 with `Result<AuthVerifyCodeSuccess>` (User + AuthToken).
  - On expired code → 400 with `VALIDATION_ERROR`.
  - On wrong code → 401 with `UNAUTHORIZED`.
  - On too many attempts → 429 with `TOO_MANY_REQUESTS`.

- `GET /auth/me`
  - Currently returns a dummy User wrapped in `Result<AuthMeResponse>` (200).
  - TODO: Wire real token-based auth (read token from headers, validate, return real user).

**Current Admin Implementation (MVP)**:

- `GET /admin/users`
  - Returns `Result<UsersListResponse>` powered by the in-memory admin catalog.
  - Intended for the internal-tool-strategy UI to display user metadata.
  - Read-only for now; authZ and PostgreSQL persistence are future work.

---

## 4. Testing Expectations

See Confluence `6.1 – Testing Strategy & Quality Gates` for details.

For `server-strategy` specifically:

- **Unit tests**:
  - Validation helpers (auth payloads).
  - Verification code store behavior (expiry, attempts, etc.) – if tested in isolation.

- **Integration tests** (already started):
  - `/auth/...` endpoints via Supertest + Vitest.
  - `/admin/users` read-only listing backed by the in-memory store.
  - Assert HTTP status codes and response shapes using shared DTOs from `common-strategy`.

All PRs should keep:

- `yarn lint`
- `yarn test`
- `yarn build`

**green**.

---

## 5. Documentation Sources

- **Confluence Space**: “End to End Company Products”
  - `01 – Vision & Strategy` – product vision, personas, roadmap.
  - `02 – System Architecture` – overall architecture and interactions.
  - `03 – Repositories → server-strategy` – detailed docs for this service.
  - `05 – APIs & Contracts → 5.1 – Authentication (Email + 6-digit Code)` – auth contracts.

If this file and Confluence ever disagree, **Confluence is the source of truth**, and this file should be updated.

---

## 6. How Agents Should Use This

- Assume this service:
  - **Consumes** shared DTOs and error types from `common-strategy`.
  - **Implements** HTTP endpoints that must always return `Result<T>` bodies.
- When adding new endpoints:
  - Prefer to first define/update DTOs in `common-strategy`.
  - Then implement endpoints here using those DTOs.
  - Add/extend integration tests to cover success and failure paths.
- When changing contracts:
  - Update `common-strategy`, this repo, and affected clients (`web-client`, `mobile-client`).
  - Update Confluence under `05 – APIs & Contracts`.

Use this file + `README.md` to stay aligned with the system as a whole.
