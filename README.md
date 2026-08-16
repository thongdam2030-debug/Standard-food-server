# StandarFood POS Server

Backend API for StandarFood POS, built with Node.js, Express, and MongoDB.

## Setup

1. Install dependencies:

```text
npm install
```

2. Create `.env` from `.env.example` and update values if needed.

3. Start MongoDB locally or set `MONGODB_URI` to your MongoDB connection string.

4. Run development server:

```text
npm run dev
```

## Scripts

```text
npm run dev
npm start
npm run lint
npm test
```

## Health Check

```text
GET /api/health
```
