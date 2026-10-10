import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter, { userRouter } from './routes/authRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import testRoutes from './routes/testRoutes.js';
import statRoutes from './routes/statRoutes.js';
import { seedIfEmpty } from './seed/seedRunner.js';

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('ERROR: MONGO_URI and JWT_SECRET environment variables are required.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'Cura POCT Urinalysis API Server Running', health: '/api/health' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/patients', patientRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/stats', statRoutes);

app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
