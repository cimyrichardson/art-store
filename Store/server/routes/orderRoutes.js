const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, adminRequired } = require('../utils/auth');

/**
 * @route POST /api/orders
 * @description Crée une nouvelle commande
 * @access Private
 * @param {Array} items - Produits commandés
 * @param {number} items.product_id - ID du produit
 * @param {number} items.quantity - Quantité commandée
 * @param {string} payment_method - Méthode de paiement (paypal, wise, moncash, natcash)
 * @param {string} shipping_address - Adresse de livraison
 */
router.post('/', verifyToken, orderController.createOrder);

/**
 * @route GET /api/orders
 * @description Récupère les commandes de l'utilisateur
 * @access Private
 * @param {number} [page=1] - Numéro de page
 * @param {number} [limit=10] - Commandes par page
 */
router.get('/', verifyToken, orderController.getUserOrders);

/**
 * @route GET /api/orders/:id
 * @description Récupère les détails d'une commande
 * @access Private
 * @param {number} id - ID de la commande
 */
router.get('/:id', verifyToken, orderController.getOrderDetails);

/**
 * @route GET /api/orders/admin/all
 * @description Récupère toutes les commandes (Admin seulement)
 * @access Private/Admin
 * @param {number} [page=1] - Numéro de page
 * @param {number} [limit=20] - Commandes par page
 */
router.get('/admin/all', verifyToken, adminRequired, orderController.getAllOrders);

/**
 * @route PUT /api/orders/:id/status
 * @description Met à jour le statut d'une commande (Admin seulement)
 * @access Private/Admin
 * @param {number} id - ID de la commande
 * @param {string} status - Nouveau statut (pending, processing, shipped, delivered, cancelled)
 */
router.put('/:id/status', verifyToken, adminRequired, orderController.updateOrderStatus);

/**
 * @route POST /api/orders/:id/payment
 * @description Simule un paiement pour une commande
 * @access Private
 * @param {number} id - ID de la commande
 * @param {string} method - Méthode de paiement (paypal, wise, moncash, natcash)
 */
router.post('/:id/payment', verifyToken, orderController.simulatePayment);

module.exports = router;