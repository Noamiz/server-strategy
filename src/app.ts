import express from 'express';
import { authRouter } from './routes/authRoutes';

const app = express();

app.use(express.json());
app.use('/auth', authRouter);

export { app };

