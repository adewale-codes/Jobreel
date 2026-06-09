up:
	docker compose up --build -d

down:
	docker compose down

down-v:
	docker compose down -v

migrate:
	docker compose exec api alembic upgrade head

test:
	docker compose exec api pytest

logs:
	docker compose logs -f

ps:
	docker compose ps
