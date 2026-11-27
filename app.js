import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import templateRoutes from './routes/templateRoutes.js';
import stickerGenerationRoutes from './routes/stickerGenerationRoutes.js';
import generationHistoryRoutes from './routes/generationHistoryRoutes.js';
import importRoutes from './routes/importRoutes.js';
import mappingRoutes from './routes/mappingRoutes.js';
import consolidationRoutes from './routes/consolidationRoutes.js';
import productRoutes from './routes/productRoutes.js';
import variantRoutes from './routes/variantRoutes.js';
import stockImportRoutes from './routes/stockImportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

connectDB();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Sticker Studio API is running' }));
app.use('/api/templates', templateRoutes);
app.use('/api/stickers', stickerGenerationRoutes);
app.use('/api/generation-history', generationHistoryRoutes);
app.use('/api/imports', importRoutes);
app.use('/api/imports', stockImportRoutes);
app.use('/api/mappings', mappingRoutes);
app.use('/api/consolidation', consolidationRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', variantRoutes);
app.use(errorHandler);


export default app;