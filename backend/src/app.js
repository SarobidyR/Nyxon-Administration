require('dotenv').config();
require('express-async-errors');

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const { connectDB } = require('./config/db');
const errorHandler  = require('./middlewares/errorHandler');

// Routes
const authRoutes        = require('./modules/auth/routes');
const produitsRoutes    = require('./modules/produits/routes');
const clientsRoutes     = require('./modules/clients/routes');
const fournisseursRoutes= require('./modules/fournisseurs/routes');
const marquesRoutes     = require('./modules/marques/routes');
const categoriesRoutes  = require('./modules/categories/routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Sécurité & parsing ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ──────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    app:       process.env.APP_NAME || 'Nyxon',
    env:       process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth',         authRoutes);
app.use('/api/produits',     produitsRoutes);
app.use('/api/clients',      clientsRoutes);
app.use('/api/fournisseurs', fournisseursRoutes);
app.use('/api/marques',      marquesRoutes);
app.use('/api/categories',   categoriesRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} introuvable` });
});

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ── Démarrage ───────────────────────────────────────────────
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ Serveur ${process.env.APP_NAME} démarré sur le port ${PORT}`);
    console.log(`   ENV  : ${process.env.NODE_ENV}`);
    console.log(`   CORS : ${process.env.CORS_ORIGIN}`);
  });
};

start();