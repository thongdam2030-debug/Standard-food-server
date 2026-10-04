# Docker deployment

This setup runs only the POS API container. MongoDB is not included; set `MONGODB_URI` in `.env` to an existing MongoDB server.

## First deploy on Ubuntu server

Run inside the `pos-server` folder on the server:

```sh
cd ~/Standard-food-server/pos-server
cp .env.example .env
```

Edit `.env` before starting:

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

Build and run on the server:

```sh
docker compose up -d --build
docker compose ps
docker compose logs -f pos-server
```

The API is exposed on port `4000` by default. Change the host port with `POS_SERVER_PORT` in `.env` if needed:

```env
POS_SERVER_PORT=8080
```

## Update deployment

After pushing new code to GitHub, pull and rebuild on the server:

```sh
cd ~/Standard-food-server
git pull
cd pos-server
docker compose up -d --build
```

Clean old unused Docker layers when disk space gets tight:

```sh
docker image prune -f
```