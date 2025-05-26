const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Récupérer tous les produits
router.get('/', async (req, res, next) => {
  try {
    let query = 'SELECT * FROM products';
    const params = [];
    
    // Filtrage par catégorie
    if (req.query.category) {
      query += ' WHERE category_id = ?';
      params.push(req.query.category);
    }
    
    // Tri
    if (req.query.sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (req.query.sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    }

    const [products] = await pool.execute(query, params);
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// Récupérer un produit spécifique
router.get('/:id', async (req, res, next) => {
  try {
    const [product] = await pool.execute(
      'SELECT * FROM products WHERE product_id = ?',
      [req.params.id]
    );
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    
    res.json(product[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;