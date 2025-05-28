const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'votre_clé_secrète_super_sécurisée';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

/**
 * Génère un token JWT
 * @param {Object} payload - Données à inclure dans le token
 * @param {number} payload.id - ID de l'utilisateur
 * @param {string} payload.role - Rôle de l'utilisateur
 * @returns {string} Token JWT
 */
const generateToken = (payload) => {
  return jwt.sign(
    {
      id: payload.id,
      role: payload.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Middleware de vérification de token
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
const verifyToken = (req, res, next) => {
  // Récupération du token depuis les headers ou les cookies
  const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.token;

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Accès refusé. Aucun token fourni.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Erreur vérification token:', err);
    return res.status(401).json({ 
      success: false,
      message: 'Token invalide ou expiré.'
    });
  }
};

/**
 * Middleware de vérification de rôle admin
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Function} next - Fonction next
 */
const adminRequired = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false,
      message: 'Accès refusé. Privilèges insuffisants.'
    });
  }
  next();
};

/**
 * Hash un mot de passe avec bcrypt
 * @param {string} password - Mot de passe en clair
 * @returns {Promise<string>} Mot de passe hashé
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

/**
 * Compare un mot de passe avec un hash
 * @param {string} password - Mot de passe en clair
 * @param {string} hashedPassword - Mot de passe hashé
 * @returns {Promise<boolean>} True si correspondance
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  generateToken,
  verifyToken,
  adminRequired,
  hashPassword,
  comparePassword
};