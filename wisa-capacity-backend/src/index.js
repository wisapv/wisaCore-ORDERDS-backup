import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import capacityRoutes from './capacity/capacity.routes.js';
import minmaxRoutes from './minmax3month/minmax.routes.js';
import { initSchema } from './db/initSchema.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/capacity', capacityRoutes);
app.use('/api/minmax3month', minmaxRoutes);

// initSchema() logs and continues on failure (e.g. PostgreSQL not installed/running) so the
// rest of the API stays available even when the history feature can't persist anything.
await initSchema();

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});