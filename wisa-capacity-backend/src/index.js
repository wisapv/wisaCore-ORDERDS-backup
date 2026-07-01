import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import capacityRoutes from './capacity/capacity.routes.js';
import minmaxRoutes from './minmax3month/minmax.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/capacity', capacityRoutes);
app.use('/api/minmax3month', minmaxRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});