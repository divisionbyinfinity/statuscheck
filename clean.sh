#!/bin/bash
echo "Docker Compose Down..."
docker compose down
echo "Cleaning up Docker environment"
docker compose down -v
docker system prune -a --volumes -f
docker ps
