import express from 'express';
import bookingsRouter from './routes/bookings';
import healthRouter from './routes/health';
import authRouter from './routes/auth';

const app = express();
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/bookings', bookingsRouter);

app.get('/', (req, res) => res.send('Library Seat Reservation API'));

export default app;
