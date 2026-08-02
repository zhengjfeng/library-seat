import { Router } from 'express';
import pool from '../services/db';

const router = Router();

// Create a booking
// body: { user_id, seat_id, start_at, end_at }
router.post('/', async (req, res) => {
  const { user_id, seat_id, start_at, end_at } = req.body;
  if (!user_id || !seat_id || !start_at || !end_at) {
    return res.status(400).json({ error: 'missing parameters' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
    const insertRes = await client.query(insertQuery, [user_id, seat_id, start_at, end_at]);
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

// Cancel a booking
router.post('/:id/cancel', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  try {
    const result = await pool.query('UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2 RETURNING *', ['cancelled', id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'not_found' });
    return res.json({ booking: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

// List bookings for a user
router.get('/', async (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'missing user_id query' });
  try {
    const result = await pool.query('SELECT * FROM bookings WHERE user_id = $1 ORDER BY start_at DESC LIMIT 50', [userId]);
    return res.json({ bookings: result.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
