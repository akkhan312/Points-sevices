# Points-Wallet Service

A production-ready points-wallet service built with Node.js, TypeScript, Express, and MongoDB. The service manages user point balances and point-to-cash conversions (stored in minor units/halalas) using strict idempotency controls and database-level concurrency locking.

## Features

- **Express API**: RESTful endpoints for awarding points, redeeming points, converting to cash, and fetching wallet state.
- **MongoDB Integration**: Uses Mongoose for data persistence, atomic updates, and transactional safety.
- **Concurrency Locks**: Uses an in-memory lock (`WalletLockManager`) per user, coupled with an idempotent request tracker stored in the database.
- **Strict Idempotency**: Safe to retry requests. Uses a global registry in MongoDB to ensure only one instance of a request runs at a time.
- **Halala Accuracy**: Cash balances are strictly maintained in integer minor units (halalas) to prevent precision issues.

## Endpoints

- `POST /api/wallet/award`: Awards points to a user.
- `POST /api/wallet/redeem`: Redeems points from a user.
- `POST /api/wallet/convert`: Converts points to cash halalas (default rate: 0.5 halalas per point).
- `GET /api/wallet/:userId`: Retrieves user wallet state.
- `GET /api/wallet/:userId/ledger`: Retrieves user transaction history.

**Required Header for POST requests:** `x-request-id` (must be unique for each request).

## Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start a MongoDB instance locally (or set `MONGO_URI` environment variable).

3. Run the development server:
```bash
npm run build
npm start
```

## Running Tests

Run the full integration test suite, which uses `mongodb-memory-server` and `supertest`:

```bash
npm test
```
