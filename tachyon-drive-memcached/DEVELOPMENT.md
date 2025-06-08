# Setup local development environment

## Setup docker memcached container

```bash
docker run --name dev-memcache -p 11211:11211 -d memcached

```

## Setup .env file

Create a `.env` file in the root directory of the project with the following content:

```bash
MEMCACHED_URLS="memcached://localhost:11211"
```
