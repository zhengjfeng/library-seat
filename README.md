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
- POST /api/auth/register { account_id, name, email, password }
- POST /api/auth/login { account_id, password }
- POST /api/bookings  { seat_id, start_at, end_at } (requires Authorization: Bearer <token>)
- POST /api/bookings/:id/cancel (requires auth)
- POST /api/bookings/:id/checkin (requires auth)
- GET /api/bookings (requires auth)

Notes & next steps:
- Add more endpoints: rooms, seats, admin UI
- Add notifications (email/sms/push)
- Add background worker to handle check-in/timeout and reminders (already included as npm run worker)
- Add tests and CI
