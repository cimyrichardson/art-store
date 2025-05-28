const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../utils/auth');

/**
 * @route POST /api/auth/register
 * @description Enregistre un nouvel utilisateur
 * @access Public
 * @param {string} username - Nom d'utilisateur
 * @param {string} email - Email valide
 * @param {string} password - Mot de passe (min 6 caractères)
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @description Connecte un utilisateur
 * @access Public
 * @param {string} email - Email enregistré
 * @param {string} password - Mot de passe correspondant
 */
router.post('/login', authController.login);

/**
 * @route GET /api/auth/profile
 * @description Récupère le profil de l'utilisateur connecté
 * @access Private
 */
router.get('/profile', verifyToken, authController.getUserProfile);

/**
 * @route POST /api/auth/logout
 * @description Déconnecte l'utilisateur
 * @access Private
 */
router.post('/logout', verifyToken, authController.logout);

/**
 * @route PUT /api/auth/update
 * @description Met à jour le profil utilisateur
 * @access Private
 * @param {string} [username] - Nouveau nom d'utilisateur
 * @param {string} [email] - Nouvel email
 */
router.put('/update', verifyToken, authController.updateProfile);

/**
 * @route PUT /api/auth/change-password
 * @description Change le mot de passe de l'utilisateur
 * @access Private
 * @param {string} currentPassword - Mot de passe actuel
 * @param {string} newPassword - Nouveau mot de passe
 */
router.put('/change-password', verifyToken, authController.changePassword);

module.exports = router;