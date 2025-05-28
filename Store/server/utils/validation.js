const { check, validationResult } = require('express-validator');
const User = require('../models/User');

/**
 * Ensemble de validations pour l'inscription
 */
const validateRegister = [
  check('username')
    .trim()
    .notEmpty().withMessage('Le nom d\'utilisateur est requis')
    .isLength({ min: 3, max: 30 }).withMessage('Le nom d\'utilisateur doit contenir entre 3 et 30 caractères')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),

  check('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Email invalide')
    .custom(async (email) => {
      const user = await User.findByEmail(email);
      if (user) {
        throw new Error('Cet email est déjà utilisé');
      }
    }),

  check('password')
    .notEmpty().withMessage('Le mot de passe est requis')
    .isLength({ min: 8 }).withMessage('Le mot de passe doit contenir au moins 8 caractères')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')
];

/**
 * Ensemble de validations pour la connexion
 */
const validateLogin = [
  check('email')
    .trim()
    .notEmpty().withMessage('L\'email est requis')
    .isEmail().withMessage('Email invalide'),

  check('password')
    .notEmpty().withMessage('Le mot de passe est requis')
];

/**
 * Ensemble de validations pour les produits
 */
const validateProduct = [
  check('name')
    .trim()
    .notEmpty().withMessage('Le nom du produit est requis')
    .isLength({ max: 100 }).withMessage('Le nom ne peut excéder 100 caractères'),

  check('description')
    .trim()
    .notEmpty().withMessage('La description est requise')
    .isLength({ max: 1000 }).withMessage('La description ne peut excéder 1000 caractères'),

  check('price')
    .isFloat({ gt: 0 }).withMessage('Le prix doit être un nombre positif')
    .toFloat(),

  check('category_id')
    .isInt({ gt: 0 }).withMessage('ID de catégorie invalide')
    .toInt(),

  check('stock_quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('La quantité doit être un entier positif ou nul')
    .toInt()
];

/**
 * Middleware de traitement des erreurs de validation
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * Validation des méthodes de paiement
 */
const validatePaymentMethod = (method) => {
  const allowedMethods = ['paypal', 'wise', 'moncash', 'natcash'];
  return allowedMethods.includes(method);
};

/**
 * Validation des données de commande
 */
const validateOrderItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.every(item => 
    item.product_id && item.quantity && 
    Number.isInteger(item.quantity) && item.quantity > 0
  );
};

module.exports = {
  validateRegister,
  validateLogin,
  validateProduct,
  handleValidationErrors,
  validatePaymentMethod,
  validateOrderItems
};