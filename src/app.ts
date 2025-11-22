import express from 'express';
import { adminRouter } from './routes/adminRoutes';
import { authRouter } from './routes/authRoutes';

const app = express();

app.use(express.json());
app.use('/auth', authRouter);
app.use('/admin', adminRouter);

export { app };

