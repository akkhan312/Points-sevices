# Points-Wallet Service

A robust points-wallet service implemented in Node.js and TypeScript.

## Features

- **Award Points**: Securely award points to a user.
- **Redeem Points**: Redeem points with strict non-negative balance checks.
- **Convert Points to Cash**: Convert points to cash using float rates. Cash is strictly stored in **integer minor units (halalas)**, preventing float precision issues in financial values.
- **Strict Idempotency**: Guarantees that duplicate requests with the same `requestId` return the exact cached result (or throw the same cached error) without processing again.
- **Concurrency Safety**: Serializes requests on a per-user basis using a queue-based lock to prevent race conditions during concurrent transactions.
- **Ledger Log**: Appends every operation to an immutable transaction ledger.

---

## Architectural & Design Choices

### 1. Integer Minor Units (Halalas)

Floating-point arithmetic is prone to rounding errors (e.g., `0.1 + 0.2 = 0.30000000000000004`), which is unacceptable for monetary values.

- Money balances and changes are strictly stored and computed as **integers representing halalas**.
- When converting points to cash with a conversion rate (e.g. `cash = points * rate`), the system uses `Math.floor()` to round down the resulting halalas to the nearest integer. This guarantees no fractional halalas (floats) enter the ledger or wallet state.

### 2. Idempotency Strategy

To ensure that an operation is not processed twice (even under retries), every operation receives a `requestId`.

- We maintain a cache of processed request IDs (`processedRequests`).
- Successful outcomes are stored along with their final state.
- Validation failures (e.g. `Insufficient points balance`) are also cached, so subsequent retries with the same request ID throw the identical business validation error.
- To prevent concurrent duplicate submissions of the same `requestId` (a race condition where both requests read empty caches before either finishes), we maintain a global `pendingRequests` set. If a duplicate `requestId` is received while the first is in progress, it is rejected immediately.

### 3. Concurrency Locking

In asynchronous Node.js applications, operations yield control of the event loop during promise resolutions (e.g., database writes, network calls, locks). If two requests for the same user execute concurrently, they can read the same initial state and double-spend (race condition).

- We implement a lightweight `UserLock` using a Promise chain queue.
- Locks are grouped dynamically by `userId`.
- This ensures that for a single user, transaction A must fully complete (updating balances, committing transactions, and writing cache) before transaction B starts.
- Because locks are per-user, operations for _different_ users execute in parallel without any bottleneck.

---

## Installation & Setup

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Build TypeScript**:

   ```bash
   npm run build
   ```

3. **Run Unit Tests**:

   ```bash
   npm test
   ```

4. **Run Tests with Coverage**:

   ```bash
   npm run test:coverage
   ```

5. **Code Formatting (Prettier)**:

   ```bash
   # Automatically format all source and test files
   npm run format

   # Verify all files match style requirements
   npm run format:check
   ```
