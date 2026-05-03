.PHONY: help setup install db-up db-down db-logs db-shell migrate migrate-apply seed dev dev-be dev-fe dev-all typecheck test types clean reset

help:
	@echo "interview-jopay — make targets"
	@echo ""
	@echo "  make setup       Install deps, start DB, migrate, seed (one-shot from clone)"
	@echo "  make install     npm install in backend + frontend"
	@echo "  make db-up       Start Postgres via docker-compose"
	@echo "  make db-down     Stop Postgres"
	@echo "  make db-logs     Tail Postgres logs"
	@echo "  make db-shell    psql into the running Postgres"
	@echo "  make migrate     Generate (don't apply) a Prisma migration; review then 'make migrate-apply'"
	@echo "  make migrate-apply  Apply pending migrations (prisma migrate deploy)"
	@echo "  make seed        Run Prisma db seed"
	@echo "  make dev         Alias for 'make dev-be' (backend Fastify dev server)"
	@echo "  make dev-be      Run backend dev server (Fastify with hot reload, :3001)"
	@echo "  make dev-fe      Run frontend dev server (Next.js, :3000)"
	@echo "  make dev-all     Run backend + frontend in parallel (Ctrl-C stops both)"
	@echo "  make types       Regenerate frontend api-types.ts from backend's OpenAPI spec"
	@echo "  make typecheck   tsc --noEmit on backend (and frontend, when wired)"
	@echo "  make test        Run all backend tests (vitest)"
	@echo "  make clean       Stop DB and remove its volume (DESTROYS data)"
	@echo "  make reset       clean + setup (full from-scratch rebuild)"

setup: install db-up wait-db migrate-apply seed
	@echo ""
	@echo "✓ Setup complete. Run 'make dev-all' to start backend + frontend together."

install:
	cd backend && npm install
	@if [ -d frontend ] && [ -f frontend/package.json ]; then cd frontend && npm install; fi

db-up:
	docker compose up -d

db-down:
	docker compose down

db-logs:
	docker compose logs -f postgres

db-shell:
	docker exec -it jopay-postgres psql -U jopay -d jopay

wait-db:
	@echo "Waiting for Postgres to be ready..."
	@until docker exec jopay-postgres pg_isready -U jopay -d jopay > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "✓ Postgres ready"

# Generates a migration but does NOT apply it. Required because Prisma sees
# schema-vs-DB drift (the pg_trgm GIN indexes are managed by raw-SQL migration
# `add_pg_trgm_gin_search`, not the schema.prisma DSL) and will auto-emit
# `DROP INDEX *_trgm_idx` if you let it. Review the generated SQL, edit out
# any DROP INDEX hits, then run `make migrate-apply` to apply.
migrate:
	@echo "→ Generating migration (NOT applying)."
	@echo "  Review backend/prisma/migrations/<timestamp>_*/migration.sql before applying."
	@echo "  If you see DROP INDEX *_trgm_idx, EDIT IT OUT — those are raw-SQL-managed."
	cd backend && npx prisma migrate dev --create-only

migrate-apply:
	cd backend && npx prisma migrate deploy

seed:
	cd backend && npm run db:seed

dev: dev-be

dev-be:
	cd backend && npm run dev

dev-fe:
	cd frontend && npm run dev

# Run BE + FE in parallel. Both processes share this shell; Ctrl-C kills both.
# Logs interleave; use `make dev-be` / `make dev-fe` separately if you need
# clean per-process output.
dev-all:
	@echo "Starting backend (:3001) and frontend (:3000) — Ctrl-C stops both."
	@(cd backend && npm run dev) & \
	 (cd frontend && npm run dev) & \
	 wait

# Regenerate frontend's typed API client from the running backend's OpenAPI
# spec. Requires backend to be reachable at localhost:3001 — start it with
# `make dev-be` in another terminal first.
types:
	@if ! curl -sf http://localhost:3001/docs/json > /dev/null; then \
		echo "ERROR: backend isn't responding on :3001. Run 'make dev-be' first."; \
		exit 1; \
	fi
	cd frontend && npx openapi-typescript http://localhost:3001/docs/json -o src/lib/api-types.ts
	@echo "✓ frontend/src/lib/api-types.ts regenerated"

typecheck:
	cd backend && npm run typecheck
	@if [ -d frontend ] && [ -f frontend/package.json ]; then \
		cd frontend && npx tsc --noEmit; \
	fi

test:
	cd backend && npm test

clean:
	docker compose down -v

reset: clean setup
