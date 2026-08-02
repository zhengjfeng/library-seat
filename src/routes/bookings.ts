import { Router } from 'express';
import pool from '../services/db';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Create a booking
// body: { seat_id, start_at, end_at }
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  const user = req.user;
  const { seat_id, start_at, end_at } = req.body;
  if (!seat_id || !start_at || !end_at) return res.status(400).json({ error: 'missing parameters' });

  const maxHours = Number(process.env.MAX_BOOKING_HOURS || 4);
  const maxDays = Number(process.env.MAX_BOOKING_DAYS || 7);
  const start = new Date(start_at);
  const end = new Date(end_at);
  if (end <= start) return res.status(400).json({ error: 'invalid_time_range' });
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  if (hours > maxHours) return res.status(400).json({ error: `max_booking_hours_exceeded (${maxHours})` });
  const now = new Date();
  const maxAdvance = new Date();
  maxAdvance.setDate(now.getDate() + maxDays);
  if (start > maxAdvance) return res.status(400).json({ error: `cannot_book_more_than_${maxDays}_days_in_advance` });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check user active bookings count
    const activeRes = await client.query(
      "SELECT COUNT(1) as cnt FROM bookings WHERE user_id = $1 AND status IN ('confirmed','checked_in') AND end_at > now()",
      [user.id]
    );
    const cnt = Number(activeRes.rows[0].cnt);
    const maxConcurrent = Number(process.env.MAX_CONCURRENT_BOOKINGS || 1);
    if (cnt >= maxConcurrent) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'user_has_too_many_active_bookings' });
    }

    // Simple conflict check: find overlapping bookings for same seat
    const conflictQuery = `
      SELECT id FROM bookings
      WHERE seat_id = $1
        AND status = 'confirmed'
        AND NOT (end_at <= $2 OR start_at >= $3)
      FOR UPDATE
    `;
    const conflictRes = await client.query(conflictQuery, [seat_id, start_at, end_at]);
    if (conflictRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'seat already booked for this period' });
    }

    const insertQuery = `
      INSERT INTO bookings (user_id, seat_id, start_at, end_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const insertRes = await client.query(insertQuery, [user.id, seat_id, start_at, end_at]);
    await client.query('COMMIT');
    return res.status(201).json({ booking: insertRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  } finally {
    client.release();
  }
});

// Cancel a booking (owner or admin)
router.post('/:id/cancel', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    // Ensure owner or admin
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingRes.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    const booking = bookingRes.rows[0];
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    const result = await pool.query('UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', ['cancelled', id]);
    return res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// Check-in
router.post('/:id/checkin', authMiddleware, async (req: AuthRequest, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const bookingRes = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (bookingRes.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    const booking = bookingRes.rows[0];
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });

    // Only allow checkin within allowed window: from start_at to start_at + grace minutes
    const grace = Number(process.env.BOOKING_GRACE_MINUTES || 15);
    const now = new Date();
    const start = new Date(booking.start_at);
    const latest = new Date(start.getTime() + grace * 60 * 1000);
    if (now < start || now > latest) return res.status(400).json({ error: 'not_in_checkin_window' });

    const result = await pool.query("UPDATE bookings SET status = 'checked_in', checked_in = true, checkin_at = now(), updated_at = now() WHERE id = $1 RETURNING *", [id]);
    return res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// List bookings for current user
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY start_at DESC LIMIT 100', [req.user.id]);
    return res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
