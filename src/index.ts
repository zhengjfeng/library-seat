import dotenv from 'dotenv';
dotenv.config();
import app from './app';

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

// For local dev convenience: log that worker can be started separately
if (process.env.NODE_ENV !== 'production') {
  console.log('Run `npm run worker` in another terminal to start the background worker that handles check-in timeouts.');
}
