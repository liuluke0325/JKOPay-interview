.PHONY: help setup install db-up db-down db-logs db-shell migrate seed dev typecheck clean reset

help:
	@echo "interview-jopay — make targets"
	@echo ""
	@echo "  make setup       Install deps, start DB, migrate, seed (one-shot from clone)"
	@echo "  make install     npm install in backend (and frontend, when it exists)"
	@echo "  make db-up       Start Postgres via docker-compose"
	@echo "  make db-down     Stop Postgres"
	@echo "  make db-logs     Tail Postgres logs"
	@echo "  make db-shell    psql into the running Postgres"
	@echo "  make migrate     Run Prisma migrations (dev mode)"
	@echo "  make seed        Run Prisma db seed"
	@echo "  make dev         Run backend dev server (Fastify with hot reload)"
	@echo "  make typecheck   Run tsc --noEmit on backend"
	@echo "  make clean       Stop DB and remove its volume (DESTROYS data)"
	@echo "  make reset       clean + setup (full from-scratch rebuild)"

setup: install db-up wait-db migrate seed
	@echo ""
	@echo "✓ Setup complete. Run 'make dev' to start the backend."

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

migrate:
	cd backend && npx prisma migrate dev

seed:
	cd backend && npm run db:seed

dev:
	cd backend && npm run dev

typecheck:
	cd backend && npm run typecheck

clean:
	docker compose down -v

reset: clean setup
