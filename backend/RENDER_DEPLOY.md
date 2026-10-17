# Render backend setup

- Deploy branch `main`, with root directory `backend`.
- Build command: `npm ci`. Start command: `npm start`.
- Set `MONGO_URI` in Render's environment settings to your complete MongoDB connection string, including the database name. Do not commit credentials.
- Set the other application variables listed in `.env.example` using your own values. Render supplies `PORT`.
- Allow the service's outbound network access in MongoDB Atlas and confirm the database user has the required permissions.
- Set the health check path to `/api/health`. It returns 200 when MongoDB is connected and 503 otherwise. The server and hourly verification job start only after the initial database connection succeeds.

For local development, copy `.env.example` to `.env`, fill in your values, and run commands from `backend`.

Rotate credentials exposed in chat: the database password, email app password, and any exposed JWT secret. Plan blockchain signing-key rotation with migration of existing signed records; replacing the key alone can invalidate historical verification. Never paste secrets into logs or commits.
