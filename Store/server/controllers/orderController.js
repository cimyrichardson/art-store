const pool = require('../config/db');

exports.createOrder = async (req, res) => {
  try {
    const { items, paymentMethod, shippingAddress } = req.body;
    const userId = req.user.id;

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Panier vide' });
    }

    if (!paymentMethod || !shippingAddress) {
      return res.status(400).json({ success: false, message: 'Méthode de paiement et adresse requis' });
    }

    await pool.beginTransaction();

    try {
      // 1. Calculer le total et vérifier le stock
      let total = 0;
      const productUpdates = [];

      for (const item of items) {
        const [product] = await pool.execute(
          'SELECT price, stock_quantity FROM products WHERE product_id = ? FOR UPDATE',
          [item.product_id]
        );

        if (product.length === 0) {
          throw new Error(`Produit ${item.product_id} non trouvé`);
        }

        if (product[0].stock_quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour le produit ${item.product_id}`);
        }

        total += product[0].price * item.quantity;
        productUpdates.push({
          product_id: item.product_id,
          newStock: product[0].stock_quantity - item.quantity
        });
      }

      // 2. Créer la commande
      const [orderResult] = await pool.execute(
        `INSERT INTO orders 
         (user_id, total_amount, payment_method, shipping_address) 
         VALUES (?, ?, ?, ?)`,
        [userId, total, paymentMethod, shippingAddress]
      );

      const orderId = orderResult.insertId;

      // 3. Ajouter les articles de la commande
      for (const item of items) {
        await pool.execute(
          `INSERT INTO order_items 
           (order_id, product_id, quantity, price_at_purchase) 
           VALUES (?, ?, ?, (SELECT price FROM products WHERE product_id = ?))`,
          [orderId, item.product_id, item.quantity, item.product_id]
        );
      }

      // 4. Mettre à jour les stocks
      for (const update of productUpdates) {
        await pool.execute(
          'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
          [update.newStock, update.product_id]
        );
      }

      // 5. Enregistrer le paiement
      await pool.execute(
        `INSERT INTO payments 
         (order_id, amount, payment_gateway, status) 
         VALUES (?, ?, ?, 'pending')`,
        [orderId, total, paymentMethod]
      );

      await pool.commit();

      // Récupérer la commande complète
      const [order] = await pool.execute(
        `SELECT o.*, 
         JSON_ARRAYAGG(
           JSON_OBJECT(
             'product_id', oi.product_id,
             'name', p.name,
             'quantity', oi.quantity,
             'price', oi.price_at_purchase
           )
         ) as items
         FROM orders o
         JOIN order_items oi ON o.order_id = oi.order_id
         JOIN products p ON oi.product_id = p.product_id
         WHERE o.order_id = ?
         GROUP BY o.order_id`,
        [orderId]
      );

      res.status(201).json({ success: true, data: order[0] });

    } catch (error) {
      await pool.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Erreur création commande:', error);
    res.status(400).json({ 
      success: false, 
      message: error.message || 'Erreur création commande' 
    });
  }
};

exports.getUserOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.order_id, o.total_amount, o.status, o.created_at, 
       COUNT(oi.order_item_id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       WHERE o.user_id = ?
       GROUP BY o.order_id
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: orders });

  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const [order] = await pool.execute(
      `SELECT o.*, 
       JSON_ARRAYAGG(
         JSON_OBJECT(
           'product_id', oi.product_id,
           'name', p.name,
           'quantity', oi.quantity,
           'price', oi.price_at_purchase,
           'image_url', p.image_url
         )
       ) as items
       FROM orders o
       JOIN order_items oi ON o.order_id = oi.order_id
       JOIN products p ON oi.product_id = p.product_id
       WHERE o.order_id = ? AND o.user_id = ?
       GROUP BY o.order_id`,
      [req.params.id, req.user.id]
    );

    if (order.length === 0) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    res.json({ success: true, data: order[0] });

  } catch (error) {
    console.error('Erreur détails commande:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Admin seulement
exports.getAllOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT o.order_id, o.total_amount, o.status, o.created_at, 
       u.username, u.email,
       COUNT(oi.order_item_id) as item_count
       FROM orders o
       LEFT JOIN order_items oi ON o.order_id = oi.order_id
       JOIN users u ON o.user_id = u.user_id
       GROUP BY o.order_id
       ORDER BY o.created_at DESC`
    );

    res.json({ success: true, data: orders });

  } catch (error) {
    console.error('Erreur récupération commandes:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Admin seulement
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Statut invalide' });
    }

    const [result] = await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Commande non trouvée' });
    }

    // Si la commande est annulée, restocker les produits
    if (status === 'cancelled') {
      await pool.execute(
        `UPDATE products p
         JOIN order_items oi ON p.product_id = oi.product_id
         SET p.stock_quantity = p.stock_quantity + oi.quantity
         WHERE oi.order_id = ?`,
        [req.params.id]
      );
    }

    res.json({ success: true, message: 'Statut mis à jour' });

  } catch (error) {
    console.error('Erreur mise à jour commande:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};