const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, adminRequired } = require('../utils/auth');

/**
 * @route GET /api/products
 * @description Récupère tous les produits avec filtres
 * @access Public
 * @param {number} [page=1] - Numéro de page
 * @param {number} [limit=10] - Produits par page
 * @param {number} [category] - ID de catégorie
 * @param {string} [search] - Terme de recherche
 * @param {string} [sort=newest] - Tri (newest, price_asc, price_desc, popular)
 */
router.get('/', productController.getAllProducts);

/**
 * @route GET /api/products/:id
 * @description Récupère un produit spécifique
 * @access Public
 * @param {number} id - ID du produit
 */
router.get('/:id', productController.getProductById);

/**
 * @route POST /api/products
 * @description Crée un nouveau produit (Admin seulement)
 * @access Private/Admin
 * @param {string} name - Nom du produit
 * @param {string} description - Description détaillée
 * @param {number} price - Prix du produit
 * @param {number} category_id - ID de la catégorie
 * @param {number} [stock_quantity=0] - Quantité en stock
 * @param {string} [image_url] - URL de l'image
 */
router.post('/', verifyToken, adminRequired, productController.createProduct);

/**
 * @route PUT /api/products/:id
 * @description Met à jour un produit (Admin seulement)
 * @access Private/Admin
 * @param {number} id - ID du produit à mettre à jour
 * @param {string} [name] - Nouveau nom
 * @param {string} [description] - Nouvelle description
 * @param {number} [price] - Nouveau prix
 * @param {number} [category_id] - Nouvelle catégorie
 * @param {number} [stock_quantity] - Nouvelle quantité
 * @param {string} [image_url] - Nouvelle URL d'image
 */
router.put('/:id', verifyToken, adminRequired, productController.updateProduct);

/**
 * @route DELETE /api/products/:id
 * @description Supprime un produit (Admin seulement)
 * @access Private/Admin
 * @param {number} id - ID du produit à supprimer
 */
router.delete('/:id', verifyToken, adminRequired, productController.deleteProduct);

/**
 * @route GET /api/products/categories
 * @description Récupère toutes les catégories
 * @access Public
 */
router.get('/categories', productController.getCategories);

module.exports = router;