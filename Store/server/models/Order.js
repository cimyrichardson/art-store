const pool = require('../config/db');

class Order {
    /**
     * Crée une nouvelle commande
     * @param {Object} orderData - Données de la commande
     * @param {number} orderData.user_id
     * @param {Array} orderData.items - Tableau d'items {product_id, quantity}
     * @param {string} orderData.payment_method
     * @param {string} orderData.shipping_address
     * @returns {Promise<number>} ID de la nouvelle commande
     */
    static async create({ user_id, items, payment_method, shipping_address }) {
        await pool.beginTransaction();

        try {
            // 1. Calculer le total et vérifier les stocks
            let total = 0;
            const stockUpdates = [];

            for (const item of items) {
                const product = await pool.execute(
                    'SELECT price, stock_quantity FROM products WHERE product_id = ? FOR UPDATE',
                    [item.product_id]
                ).then(([rows]) => rows[0]);

                if (!product) {
                    throw new Error(`Produit ${item.product_id} non trouvé`);
                }

                if (product.stock_quantity < item.quantity) {
                    throw new Error(`Stock insuffisant pour le produit ${item.product_id}`);
                }

                total += product.price * item.quantity;
                stockUpdates.push({
                    product_id: item.product_id,
                    new_quantity: product.stock_quantity - item.quantity
                });
            }

            // 2. Créer la commande
            const [orderResult] = await pool.execute(
                `INSERT INTO orders 
                 (user_id, total_amount, payment_method, shipping_address) 
                 VALUES (?, ?, ?, ?)`,
                [user_id, total, payment_method, shipping_address]
            );
            const orderId = orderResult.insertId;

            // 3. Ajouter les items de la commande
            for (const item of items) {
                await pool.execute(
                    `INSERT INTO order_items 
                     (order_id, product_id, quantity, price_at_purchase) 
                     VALUES (?, ?, ?, (SELECT price FROM products WHERE product_id = ?))`,
                    [orderId, item.product_id, item.quantity, item.product_id]
                );
            }

            // 4. Mettre à jour les stocks
            for (const update of stockUpdates) {
                await pool.execute(
                    'UPDATE products SET stock_quantity = ? WHERE product_id = ?',
                    [update.new_quantity, update.product_id]
                );
            }

            // 5. Enregistrer le paiement
            await pool.execute(
                `INSERT INTO payments 
                 (order_id, amount, payment_gateway, status) 
                 VALUES (?, ?, ?, 'pending')`,
                [orderId, total, payment_method]
            );

            await pool.commit();
            return orderId;

        } catch (error) {
            await pool.rollback();
            throw error;
        }
    }

    /**
     * Récupère les commandes d'un utilisateur
     * @param {number} userId 
     * @param {Object} [options] - Options de pagination
     * @returns {Promise<Array>} Liste des commandes
     */
    static async findByUser(userId, { limit = 10, offset = 0 } = {}) {
        const [orders] = await pool.execute(
            `SELECT o.order_id, o.total_amount, o.status, o.created_at, 
             COUNT(oi.order_item_id) as item_count
             FROM orders o
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             WHERE o.user_id = ?
             GROUP BY o.order_id
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );
        return orders;
    }

    /**
     * Récupère les détails d'une commande
     * @param {number} orderId 
     * @param {number} [userId] - Optionnel pour vérifier l'appartenance
     * @returns {Promise<Object|null>} La commande ou null si non trouvée
     */
    static async findById(orderId, userId = null) {
        let query = `
            SELECT o.*, 
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
            WHERE o.order_id = ?
        `;
        const params = [orderId];

        if (userId) {
            query += ' AND o.user_id = ?';
            params.push(userId);
        }

        query += ' GROUP BY o.order_id';

        const [orders] = await pool.execute(query, params);
        return orders[0] || null;
    }

    /**
     * Met à jour le statut d'une commande
     * @param {number} orderId 
     * @param {string} newStatus 
     * @returns {Promise<boolean>} True si mis à jour
     */
    static async updateStatus(orderId, newStatus) {
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(newStatus)) {
            throw new Error('Statut invalide');
        }

        const [result] = await pool.execute(
            'UPDATE orders SET status = ? WHERE order_id = ?',
            [newStatus, orderId]
        );

        // Si annulation, restocker les produits
        if (newStatus === 'cancelled') {
            await pool.execute(
                `UPDATE products p
                 JOIN order_items oi ON p.product_id = oi.product_id
                 SET p.stock_quantity = p.stock_quantity + oi.quantity
                 WHERE oi.order_id = ?`,
                [orderId]
            );
        }

        return result.affectedRows > 0;
    }

    /**
     * Récupère toutes les commandes (pour admin)
     * @param {Object} [options] - Options de pagination
     * @returns {Promise<Array>} Liste des commandes
     */
    static async findAll({ limit = 20, offset = 0 } = {}) {
        const [orders] = await pool.execute(
            `SELECT o.order_id, o.total_amount, o.status, o.created_at, 
             u.username, u.email,
             COUNT(oi.order_item_id) as item_count
             FROM orders o
             LEFT JOIN order_items oi ON o.order_id = oi.order_id
             JOIN users u ON o.user_id = u.user_id
             GROUP BY o.order_id
             ORDER BY o.created_at DESC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );
        return orders;
    }
}

module.exports = Order;