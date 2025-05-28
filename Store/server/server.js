require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');

// Initialisation de l'application Express
const app = express();

// 1. Sécurité de base
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Limitation des requêtes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // limite chaque IP à 500 requêtes par fenêtre
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard'
});
app.use(limiter);

// 2. Middlewares de base
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(compression());

// Configuration des sessions sécurisées
app.use(session({
  genid: () => uuidv4(),
  secret: process.env.SESSION_SECRET || 'votre_secret_tres_securise_changez_cela',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 heures
  }
}));

// 3. Authentification
require('./utils/auth'); // Configuration de Passport
app.use(passport.initialize());
app.use(passport.session());

// 4. Logging des requêtes
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);
app.use(morgan('combined', { stream: accessLogStream }));

// 5. Connexion à la base de données
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'artstore_user',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'artstore_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test de connexion à la base de données
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Connecté à la base de données MySQL');
    conn.release();
  } catch (err) {
    console.error('❌ Erreur de connexion à MySQL:', err);
    process.exit(1);
  }
})();

// 6. Routes API
const apiRouter = express.Router();

// Import des routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Montage des routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/admin', adminRoutes);

app.use('/api', apiRouter);

// 7. Servir les fichiers statics (frontend)
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

// Gestion des erreurs 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Ressource non trouvée'
  });
});

// 8. Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error('🔥 Erreur:', err.stack);

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'development' 
    ? err.message 
    : 'Une erreur est survenue';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 9. Configuration du serveur
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Serveur en écoute sur le port ${PORT}`);
  console.log(`🔗 Environnement: ${process.env.NODE_ENV || 'development'}`);
});

// 10. Gestion propre des arrêts
process.on('SIGTERM', () => {
  console.log('🛑 Fermeture du serveur...');
  server.close(() => {
    pool.end();
    console.log('✅ Serveur fermé proprement');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('🚨 Rejet non géré:', err);
  server.close(() => process.exit(1));
});

module.exports = app;