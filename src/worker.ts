import pool from './services/db';

// Background worker to handle check-in timeouts
// Runs every minute and cancels bookings where start_at + grace_minutes < now and not checked in

const grace = Number(process.env.BOOKING_GRACE_MINUTES || 15);
const intervalMs = 60 * 1000; // 1 minute

async function sweep() {
  try {
    console.log(`[worker] sweep start at ${new Date().toISOString()}`);
    const res = await pool.query(`
      SELECT id, user_id, seat_id, start_at, end_at FROM bookings
      WHERE status = 'confirmed' AND checked_in = false AND start_at <= now() - INTERVAL '${grace} minutes'
      LIMIT 100
    `);
    if (res.rowCount === 0) {
      console.log('[worker] no expired bookings');
      return;
    }
    for (const row of res.rows) {
      console.log(`[worker] cancelling booking ${row.id} (user ${row.user_id})`);
      await pool.query("UPDATE bookings SET status = 'cancelled', updated_at = now() WHERE id = $1", [row.id]);
      // TODO: notify user (email/push)
    }
  } catch (err) {
    console.error('[worker] error', err);
  }
}

async function loop() {
  await sweep();
}

console.log('[worker] starting');
loop();
setInterval(loop, intervalMs);
