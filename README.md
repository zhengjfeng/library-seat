# Library Seat Reservation - Initial scaffold

This repository contains an MVP backend scaffold for a library seat reservation system built with TypeScript + Express + PostgreSQL + Redis.

Quick start (development):

1. Copy environment variables:

   cp .env.example .env

2. Start Postgres and Redis (recommended: docker-compose):

   docker-compose up -d

3. Run DB migrations:

   npm run migrate

4. Install dev deps & run:

   npm ci
   npm run dev

API endpoints:
- GET /api/health
- POST /api/bookings  { user_id, seat_id, start_at, end_at }
- POST /api/bookings/:id/cancel
- GET /api/bookings?user_id=1

Notes & next steps:
- Add authentication (JWT/SSO)
- Add more endpoints: rooms, seats, admin UI
- Add background worker to handle check-in/timeout and reminders
- Add tests
