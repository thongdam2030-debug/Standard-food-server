# Docker deployment

This setup runs only the POS API container. MongoDB is not included; set `MONGODB_URI` in `.env` to an existing MongoDB server.

## Build locally

Run from the repository root:

```sh
docker build -t standarfood-pos-server:latest ./pos-server
docker save standarfood-pos-server:latest | gzip > pos-server.tar.gz
```

Upload the image archive and compose file to the Ubuntu server:

```sh
scp pos-server.tar.gz user@server:/opt/pos-server/
scp pos-server/docker-compose.yml user@server:/opt/pos-server/
scp pos-server/.env.example user@server:/opt/pos-server/.env
```

Edit `/opt/pos-server/.env` on the server before starting:

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://mongo-host:27017/standarfood_pos
CORS_ORIGIN=https://your-pos-frontend.example.com
JWT_SECRET=change-this-to-a-long-random-secret
JWT_EXPIRES_IN=7d
DEFAULT_OWNER_NAME=Store Owner
DEFAULT_OWNER_USERNAME=owner
DEFAULT_OWNER_PASSWORD=change-this-password
```

## Run on Ubuntu server

Run on the Ubuntu server:

```sh
cd /opt/pos-server
gunzip -c pos-server.tar.gz | docker load
docker compose up -d
docker compose ps
docker compose logs -f pos-server
```

The API is exposed on port `4000` by default. Change the host port with `POS_SERVER_PORT` in the server `.env` if needed:

```env
POS_SERVER_PORT=8080
```

## Update deployment

Build and upload a new archive from your local machine:

```sh
docker build -t standarfood-pos-server:latest ./pos-server
docker save standarfood-pos-server:latest | gzip > pos-server.tar.gz
scp pos-server.tar.gz user@server:/opt/pos-server/
```

Then reload it on Ubuntu:

```sh
cd /opt/pos-server
docker compose down
gunzip -c pos-server.tar.gz | docker load
docker compose up -d
```
