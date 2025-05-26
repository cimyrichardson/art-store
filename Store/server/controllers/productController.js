const pool = require('../config/db');
const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    let query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE 1=1
    `;
    const params = [];

    // Filtrage
    if (req.query.category) {
      query += ' AND p.category_id = ?';
      params.push(req.query.category);
    }

    if (req.query.search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${req.query.search}%`, `%${req.query.search}%`);
    }

    // Tri
    const sortOptions = {
      'price_asc': 'p.price ASC',
      'price_desc': 'p.price DESC',
      'newest': 'p.created_at DESC',
      'popular': 'p.is_featured DESC, p.created_at DESC'
    };

    const sort = sortOptions[req.query.sort] || 'p.created_at DESC';
    query += ` ORDER BY ${sort}`;

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Exécution des requêtes
    const [products] = await pool.execute(query, params);
    const [count] = await pool.execute('SELECT COUNT(*) as total FROM products');

    res.json({
      success: true,
      data: products,
      meta: {
        total: count[0].total,
        page,
        limit,
        totalPages: Math.ceil(count[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Erreur produits:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const [product] = await pool.execute(
      `SELECT p.*, c.name as category_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = ?`,
      [req.params.id]
    );

    if (product.length === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    res.json({ success: true, data: product[0] });

  } catch (error) {
    console.error('Erreur produit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Admin seulement
exports.createProduct = async (req, res) => {
  try {
    const { name, description, price, category_id, stock_quantity, image_url } = req.body;

    // Validation
    if (!name || !description || !price || !category_id) {
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    }

    const [result] = await pool.execute(
      `INSERT INTO products 
       (name, description, price, category_id, stock_quantity, image_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, stock_quantity || 0, image_url || null]
    );

    const [newProduct] = await pool.execute(
      'SELECT * FROM products WHERE product_id = ?',
      [result.insertId]
    );

    res.status(201).json({ success: true, data: newProduct[0] });

  } catch (error) {
    console.error('Erreur création produit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Admin seulement
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, category_id, stock_quantity, image_url } = req.body;

    const [result] = await pool.execute(
      `UPDATE products SET 
       name = ?, description = ?, price = ?, category_id = ?, 
       stock_quantity = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = ?`,
      [name, description, price, category_id, stock_quantity, image_url, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    const [updatedProduct] = await pool.execute(
      'SELECT * FROM products WHERE product_id = ?',
      [id]
    );

    res.json({ success: true, data: updatedProduct[0] });

  } catch (error) {
    console.error('Erreur mise à jour produit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Admin seulement
exports.deleteProduct = async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM products WHERE product_id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Produit non trouvé' });
    }

    res.json({ success: true, message: 'Produit supprimé' });

  } catch (error) {
    console.error('Erreur suppression produit:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};