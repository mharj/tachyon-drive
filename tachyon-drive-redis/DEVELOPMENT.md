# Setup local development environment

## Setup docker redis container

```bash
docker run --name dev-redis -p 6379:6379 -d redis
```

## Setup .env file

Create a `.env` file in the root directory of the project with the following content:

```
REDIS_URL="redis://localhost:6379"
```
