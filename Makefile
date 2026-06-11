up:
	docker compose up --build -d

down:
	docker compose down

down-v:
	docker compose down -v

migrate:
	docker compose exec api alembic upgrade head

test:
	docker compose exec api pytest tests/ -v

backfill:
	curl -X POST http://localhost:8000/api/pipeline/backfill

logs:
	docker compose logs -f

ps:
	docker compose ps
